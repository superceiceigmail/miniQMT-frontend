```typescript
/**
 * computeFinalHoldings.ts
 *
 * 说明（中文）：
 * 这个工具函数负责按你的要求生成 final_holdings：
 * - 不依赖当前真实持仓（Account 的持仓），而是仅基于缓存中每个策略的“操作/状态”来判断该标的在策略层面操作完之后是否仍然是“持有中”；
 * - 将所有策略中最终仍为“持有中”的同名标的合并（金额累加）；
 * - 输出 final_market_value（保留 1 位小数）和 final_pct（占账户总资金的百分比，保留 2 位小数）。
 *
 * 使用方式（示例）：
 * import { computeFinalHoldings } from '@/utils/computeFinalHoldings';
 * const final_holdings = computeFinalHoldings(strategyCache, accountTotalValue);
 *
 * 对输入格式做了比较宽松的处理，常见字段都会被尝试识别：
 * - strategy.cachedOperations: 假设为一个操作数组，数组项可能包含 name / symbol / marketValue / market_value / value / isHolding / finalState / action / qty 等字段；
 * - 如果没有 cachedOperations，但策略中对各标的有单独标记（如持有标记），可以把这些信息放到 cachedOperations 中，或在调用方先把策略转成统一形式。
 */

export type AnyObject = { [k: string]: any };

export function computeFinalHoldings(
  strategies: AnyObject[] = [],
  accountTotalValue: number = 0
): Array<{ name: string; final_market_value: number; final_pct: number }> {
  const totals: Map<string, number> = new Map();

  function toNumber(v: any) {
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // 判断某次操作记录是否表示“持有中”
  function opRepresentsHolding(op: AnyObject): boolean {
    if (!op) return false;
    // 1. 优先使用明确字段 finalState / isHolding
    if (op.finalState !== undefined) {
      const s = String(op.finalState).toLowerCase();
      if (s === '持有中' || s === 'holding' || s === 'hold' || s === '持有') return true;
      if (s === '非持有' || s === 'not holding' || s === 'sell' || s === '已卖出') return false;
    }
    if (op.isHolding !== undefined) return Boolean(op.isHolding);

    // 2. 使用 action / type / opType 字段判断
    const action = (op.action || op.type || op.opType || '').toString().toLowerCase();
    if (action) {
      if (['buy', 'b', 'open', 'hold', '持有', '入仓', '建仓'].includes(action)) return true;
      if (['sell', 's', 'close', '平仓', '卖出', '撤销'].includes(action)) return false;
    }

    // 3. 使用数量/份额判断，若 qty/volume/amount > 0 则认为是持有（仅作为最后退路）
    const qty = toNumber(op.qty ?? op.volume ?? op.amount ?? op.shares ?? op.position_qty ?? 0);
    if (qty > 0) return true;

    return false;
  }

  // 提取某次记录的市场价值
  function opMarketValue(op: AnyObject) {
    return (
      toNumber(op.marketValue ?? op.market_value ?? op.value ?? op.market_value_num ?? op.market_val ?? op.mv)
    );
  }

  for (const strat of strategies) {
    // 尝试从策略里拿到“操作记录”集合；字段名可能不同，做兼容
    const opsList: AnyObject[] =
      strat.cachedOperations ||
      strat.operations ||
      strat.actions ||
      strat.opRecords ||
      strat.planOperations ||
      [];

    // 如果拿到是对象（按标的聚合），把它转成数组
    let opsArray: AnyObject[] = [];
    if (Array.isArray(opsList)) {
      opsArray = opsList;
    } else if (opsList && typeof opsList === 'object') {
      // 对象的时候：每个 key 可能是标的名，value 为操作数组或单个对象
      for (const key of Object.keys(opsList)) {
        const v = opsList[key];
        if (Array.isArray(v)) {
          opsArray.push(...v.map((o) => ({ ...o, name: o.name ?? key })));
        } else {
          opsArray.push({ ...(typeof v === 'object' ? v : {}), name: key });
        }
      }
    }

    // 将同一策略内按标的名分组，取每个标的的“最后一次操作”作为最终状态判断依据
    const perAssetMap: Map<string, AnyObject[]> = new Map();
    for (const op of opsArray) {
      const name = (op.name ?? op.symbol ?? op.code ?? op.assetName ?? op.ticker ?? '未知').toString();
      if (!perAssetMap.has(name)) perAssetMap.set(name, []);
      perAssetMap.get(name)!.push(op);
    }

    for (const [name, ops] of perAssetMap.entries()) {
      // 找到 ops 中最后一条有意义的记录（按数组顺序或按时间戳）
      let lastOp: AnyObject | null = null;

      // 如果记录中有时间戳字段，尝试按时间排序选择最新
      const timeKeys = ['time', 'timestamp', 'ts', 'op_time', 'opAt', 'created_at'];
      const hasTime = ops.some((o) => timeKeys.some((k) => o[k] !== undefined));
      if (hasTime) {
        ops.sort((a, b) => {
          const ta = Number(a.time ?? a.timestamp ?? a.ts ?? a.op_time ?? a.opAt ?? a.created_at ?? 0) || 0;
          const tb = Number(b.time ?? b.timestamp ?? b.ts ?? b.op_time ?? b.opAt ?? b.created_at ?? 0) || 0;
          return ta - tb;
        });
        lastOp = ops[ops.length - 1];
      } else {
        // 否则按数组顺序取最后一项
        lastOp = ops[ops.length - 1];
      }

      if (!lastOp) continue;

      const isHolding = opRepresentsHolding(lastOp);
      if (!isHolding) {
        // 策略层面最终不是持有中，跳过
        continue;
      }

      const mv = opMarketValue(lastOp);
      const prev = totals.get(name) ?? 0;
      totals.set(name, prev + mv);
    }
  }

  // 转成数组并计算占比
  const entries = Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const result = entries.map((e) => {
    const final_market_value = Math.round(e.value * 10) / 10; // 1 位小数
    const final_pct =
      accountTotalValue > 0 ? Math.round(((e.value / accountTotalValue) * 100 + Number.EPSILON) * 100) / 100 : 0; // 2 位小数
    return {
      name: e.name,
      final_market_value,
      final_pct,
    };
  });

  return result;
}