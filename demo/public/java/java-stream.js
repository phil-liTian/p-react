function renderJavaStream(t) {
  // ── Section 1：结论 ────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>Stream 是 Java 8 对集合的「声明式处理管道」——描述做什么，而不是怎么做。</strong><br><br>
    ① <strong>惰性求值</strong>：中间操作（filter / map / sorted）不立即执行，终结操作（collect / count / forEach）触发整条管道；<br>
    ② <strong>不修改原集合</strong>：每次操作返回新 Stream，原 List 不变；<br>
    ③ <strong>三类终结操作</strong>：过滤取值（findFirst / anyMatch）、归约统计（count / sum / groupingBy）、收集（collect）。<br><br>
    前端类比：Stream 管道 ≈ <code>arr.filter().map().reduce()</code> 链式调用，思路完全一致。`);

  // ── Section 2：过滤 ────────────────────────────────────────────────────────

  const filterSetupCode = `// 示例数据：后续所有 Section 共用
record Order(Long id, String category, int amount, String status) {}

List<Order> orders = List.of(
    new Order(1L, "电子",  500, "paid"),
    new Order(2L, "服装",  200, "paid"),
    new Order(3L, "电子", 1200, "refund"),
    new Order(4L, "食品",   80, "paid"),
    new Order(5L, "服装",  350, "pending"),
    new Order(6L, "电子",  900, "paid")
);`;

  const filterBasicCode = `// filter：保留满足条件的元素
List<Order> paid = orders.stream()
    .filter(o -> "paid".equals(o.status()))
    .collect(Collectors.toList());
// → [1, 2, 4, 6]

// 链式 filter：多个条件
List<Order> paidElec = orders.stream()
    .filter(o -> "paid".equals(o.status()))
    .filter(o -> "电子".equals(o.category()))
    .collect(Collectors.toList());
// → [1, 6]

// findFirst：取第一个（返回 Optional，可能为空）
Optional<Order> first = orders.stream()
    .filter(o -> o.amount() > 1000)
    .findFirst();
first.ifPresent(o -> System.out.println(o.id())); // 3

// findAny：并行流中性能更好（结果不确定）
Optional<Order> any = orders.parallelStream()
    .filter(o -> o.amount() > 400)
    .findAny();`;

  const filterMatchCode = `// anyMatch / allMatch / noneMatch：短路判断，不返回元素

// anyMatch：至少一个满足
boolean hasRefund = orders.stream()
    .anyMatch(o -> "refund".equals(o.status()));
// → true

// allMatch：全部满足
boolean allPaid = orders.stream()
    .allMatch(o -> "paid".equals(o.status()));
// → false（有 refund 和 pending）

// noneMatch：全部不满足
boolean noRefund = orders.stream()
    .noneMatch(o -> "refund".equals(o.status()));
// → false

// takeWhile / dropWhile（Java 9+）：按顺序截断
// 注意：遇到第一个不满足的元素就停止，依赖有序列表
List<Order> until1000 = orders.stream()
    .takeWhile(o -> o.amount() < 1000)
    .collect(Collectors.toList());
// → [1, 2]（到第3个 amount=1200 停止）`;

  const filterJsCode = `// 前端对照：filter / find / some / every

const paid = orders.filter(o => o.status === 'paid');

const paidElec = orders
  .filter(o => o.status === 'paid')
  .filter(o => o.category === '电子');

// find → Java findFirst
const first = orders.find(o => o.amount > 1000);

// some → anyMatch
const hasRefund = orders.some(o => o.status === 'refund');

// every → allMatch
const allPaid = orders.every(o => o.status === 'paid');

// 结论：Java Stream 过滤 API 和 JS 数组方法一一对应
// 区别：Java 有 Optional 包装，避免 NPE；
//       Java takeWhile 在 Java 9 才有，JS 没有原生对应`;

  const filterSetupBlock = codeBlock('示例数据', 'dot-blue', 'java', filterSetupCode);

  const filterPair = codeBlocksRow([
    codeBlock('filter / findFirst / findAny', 'dot-green', 'java', filterBasicCode),
    codeBlock('anyMatch / allMatch / noneMatch', 'dot-orange', 'java', filterMatchCode),
  ]);

  const filterJsBlock = codeBlock('前端 JS 对照', 'dot-blue', 'javascript', filterJsCode);

  const filterNote = ruleBox('success',
    `<strong>Optional 的正确用法：</strong>
    <code>findFirst()</code> 返回 <code>Optional&lt;T&gt;</code>，不要直接 <code>.get()</code>（可能抛 <code>NoSuchElementException</code>）。<br>
    推荐用法：<code>opt.ifPresent(x -> ...)</code>、<code>opt.orElse(defaultVal)</code>、<code>opt.orElseThrow()</code>。<br>
    <strong>anyMatch / allMatch 是短路操作</strong>：找到结果立即停止遍历，比 filter + count > 0 更高效。`);

  // ── Section 3：分组 ────────────────────────────────────────────────────────

  const groupingByBasicCode = `// Collectors.groupingBy：按 key 分组，返回 Map<K, List<V>>
Map<String, List<Order>> byCategory = orders.stream()
    .collect(Collectors.groupingBy(Order::category));
// → {
//     "电子": [Order(1), Order(3), Order(6)],
//     "服装": [Order(2), Order(5)],
//     "食品": [Order(4)]
//   }

// 先过滤再分组
Map<String, List<Order>> paidByCategory = orders.stream()
    .filter(o -> "paid".equals(o.status()))
    .collect(Collectors.groupingBy(Order::category));

// 按多个条件分组：先 filter 分层，或用 Map 嵌套
// 按状态 + 分类二级分组：Map<String, Map<String, List<Order>>>
Map<String, Map<String, List<Order>>> grouped = orders.stream()
    .collect(Collectors.groupingBy(
        Order::status,
        Collectors.groupingBy(Order::category)
    ));`;

  const groupingByCountCode = `// groupingBy + downstream collector：分组后再聚合

// 每个分类的订单数
Map<String, Long> countByCategory = orders.stream()
    .collect(Collectors.groupingBy(
        Order::category,
        Collectors.counting()        // downstream: 计数
    ));
// → {"电子": 3, "服装": 2, "食品": 1}

// 每个分类的总金额
Map<String, Integer> sumByCategory = orders.stream()
    .collect(Collectors.groupingBy(
        Order::category,
        Collectors.summingInt(Order::amount)  // downstream: 求和
    ));
// → {"电子": 2600, "服装": 550, "食品": 80}

// 每个分类的订单 ID 列表（mapping：先转换再收集）
Map<String, List<Long>> idsByCategory = orders.stream()
    .collect(Collectors.groupingBy(
        Order::category,
        Collectors.mapping(Order::id, Collectors.toList())
    ));
// → {"电子": [1, 3, 6], "服装": [2, 5], "食品": [4]}`;

  const groupingByJsCode = `// 前端类比：reduce 实现 groupBy
const byCategory = orders.reduce((acc, o) => {
  (acc[o.category] ??= []).push(o);
  return acc;
}, {});
// → { "电子": [...], "服装": [...], "食品": [...] }

// 分组 + 统计：两步
const countByCategory = Object.fromEntries(
  Object.entries(byCategory).map(([k, v]) => [k, v.length])
);

// 或用 lodash groupBy（更接近 Java API）
import { groupBy, mapValues, sumBy } from 'lodash';

const grouped  = groupBy(orders, 'category');
const summed   = mapValues(grouped, arr => sumBy(arr, 'amount'));

// 结论：Java groupingBy = reduce + 分组逻辑的封装
// downstream collector = 分组后再对 List 做 map/reduce`;

  const groupingByPair = codeBlocksRow([
    codeBlock('groupingBy 基础 + 二级分组', 'dot-blue', 'java', groupingByBasicCode),
    codeBlock('groupingBy + downstream 聚合', 'dot-green', 'java', groupingByCountCode),
  ]);

  const groupingByJsBlock = codeBlock('前端 JS 对照', 'dot-orange', 'javascript', groupingByJsCode);

  const groupingByNote = ruleBox('info',
    `<strong>groupingBy 的结构：</strong>
    <code>groupingBy(classifier)</code> = <code>groupingBy(classifier, toList())</code>（默认 downstream 是 toList）。<br>
    <code>downstream</code> 可以是任意 Collector：<code>counting()</code>、<code>summingInt()</code>、<code>averagingInt()</code>、
    <code>toList()</code>、<code>mapping()</code>，甚至再嵌套一个 <code>groupingBy()</code>。<br><br>
    <strong>partitioningBy</strong>：<code>groupingBy</code> 的布尔版本，key 只有 true / false：
    <code>Collectors.partitioningBy(o -> o.amount() >= 500)</code> → <code>Map&lt;Boolean, List&lt;Order&gt;&gt;</code>`);

  // ── Section 4：统计 ────────────────────────────────────────────────────────

  const statisticsBasicCode = `// 基础统计：count / sum / average / max / min

// count：总数（终结操作）
long total = orders.stream().count();  // 6

// 条件计数：filter + count
long paidCount = orders.stream()
    .filter(o -> "paid".equals(o.status()))
    .count();  // 4

// sum：summingInt / summingLong / summingDouble
int totalAmount = orders.stream()
    .collect(Collectors.summingInt(Order::amount));  // 3230

// average：averagingInt → 返回 double
double avgAmount = orders.stream()
    .collect(Collectors.averagingInt(Order::amount));  // 538.33...

// max / min：返回 Optional<T>
Optional<Order> maxOrder = orders.stream()
    .max(Comparator.comparingInt(Order::amount));
maxOrder.map(Order::amount).ifPresent(System.out::println);  // 1200

Optional<Order> minOrder = orders.stream()
    .min(Comparator.comparingInt(Order::amount));  // amount=80`;

  const statisticsSummaryCode = `// IntSummaryStatistics：一次遍历得到所有统计值
IntSummaryStatistics stats = orders.stream()
    .collect(Collectors.summarizingInt(Order::amount));

stats.getCount();    // 6
stats.getSum();      // 3230
stats.getAverage();  // 538.33...
stats.getMax();      // 1200
stats.getMin();      // 80

// 等价于 JS 的一次 reduce 拿到所有聚合值：
// orders.reduce(
//   { count:0, sum:0, max:-Inf, min:+Inf },
//   (acc, o) => ({
//     count: acc.count + 1,
//     sum: acc.sum + o.amount,
//     max: Math.max(acc.max, o.amount),
//     min: Math.min(acc.min, o.amount),
//   })
// )

// 分组后再统计：每个分类的金额统计
Map<String, IntSummaryStatistics> statsByCategory = orders.stream()
    .collect(Collectors.groupingBy(
        Order::category,
        Collectors.summarizingInt(Order::amount)
    ));
// statsByCategory.get("电子").getSum() → 2600`;

  const statisticsReduceCode = `// reduce：通用归约，自定义聚合逻辑

// 所有金额求和（等价 summingInt，但更通用）
int sum = orders.stream()
    .map(Order::amount)
    .reduce(0, Integer::sum);   // 初始值 0，操作 sum

// 最大值（等价 max）
int max = orders.stream()
    .map(Order::amount)
    .reduce(Integer.MIN_VALUE, Math::max);

// 拼接所有分类（去重后）
String categories = orders.stream()
    .map(Order::category)
    .distinct()
    .sorted()
    .collect(Collectors.joining(", "));
// → "servicesé, 服装, 食品, 电子"（按字典序）

// joining 三参数：joining(分隔符, 前缀, 后缀)
String result = orders.stream()
    .map(o -> String.valueOf(o.id()))
    .collect(Collectors.joining(", ", "[", "]"));
// → "[1, 2, 3, 4, 5, 6]"`;

  const statisticsJsCode = `// 前端 JS 对照

const total      = orders.length;
const paidCount  = orders.filter(o => o.status === 'paid').length;
const totalAmt   = orders.reduce((s, o) => s + o.amount, 0);
const avgAmt     = totalAmt / total;
const maxOrder   = orders.reduce((a, b) => a.amount > b.amount ? a : b);
const minOrder   = orders.reduce((a, b) => a.amount < b.amount ? a : b);

// 一次 reduce 拿所有统计（= IntSummaryStatistics）
const stats = orders.reduce(
  { count: 0, sum: 0, max: -Infinity, min: Infinity },
  (acc, o) => ({
    count: acc.count + 1,
    sum:   acc.sum + o.amount,
    max:   Math.max(acc.max, o.amount),
    min:   Math.min(acc.min, o.amount),
  })
);

// joining = arr.join(', ')
const ids = orders.map(o => o.id).join(', ');`;

  const statisticsPair = codeBlocksRow([
    codeBlock('count / sum / avg / max / min', 'dot-blue', 'java', statisticsBasicCode),
    codeBlock('summarizingInt（一次遍历全统计）', 'dot-green', 'java', statisticsSummaryCode),
  ]);

  const statisticsReduceBlock = codeBlock('reduce + joining', 'dot-orange', 'java', statisticsReduceCode);
  const statisticsJsBlock = codeBlock('前端 JS 对照', 'dot-blue', 'javascript', statisticsJsCode);

  // ── Section 5：综合实战 ────────────────────────────────────────────────────

  const practiceCode = `// 综合实战：电商订单报表
// 需求：已支付订单，按分类分组，每组取总金额最高的 Top2，
//       最终输出 Map<分类, List<OrderVO>>

record OrderVO(Long id, int amount) {}

Map<String, List<OrderVO>> report = orders.stream()
    // ① 过滤：只要已支付
    .filter(o -> "paid".equals(o.status()))
    // ② 分组：按分类
    .collect(Collectors.groupingBy(
        Order::category,
        // ③ 每组内：转换 → 排序 → 取 Top2
        Collectors.collectingAndThen(
            Collectors.toList(),
            list -> list.stream()
                        .sorted(Comparator.comparingInt(Order::amount).reversed())
                        .limit(2)
                        .map(o -> new OrderVO(o.id(), o.amount()))
                        .collect(Collectors.toList())
        )
    ));

// 结果：
// {
//   "电子": [OrderVO(6, 900), OrderVO(1, 500)],
//   "服装": [OrderVO(2, 200)],   ← 只有1条 paid 服装
//   "食品": [OrderVO(4, 80)]
// }`;

  const practiceStepCode = `// 拆解上面的管道，逐步理解

// Step 1：filter
List<Order> paid = orders.stream()
    .filter(o -> "paid".equals(o.status()))
    .collect(Collectors.toList());
// paid = [Order(1), Order(2), Order(4), Order(6)]

// Step 2：groupingBy（默认 toList）
Map<String, List<Order>> grouped = paid.stream()
    .collect(Collectors.groupingBy(Order::category));
// {"电子": [1,6], "服装": [2], "食品": [4]}

// Step 3：每组内排序 + limit + map
Map<String, List<OrderVO>> report = grouped.entrySet().stream()
    .collect(Collectors.toMap(
        Map.Entry::getKey,
        e -> e.getValue().stream()
               .sorted(Comparator.comparingInt(Order::amount).reversed())
               .limit(2)
               .map(o -> new OrderVO(o.id(), o.amount()))
               .collect(Collectors.toList())
    ));

// collectingAndThen = 先收集，再对结果做一次 finisher 转换
// 等价于上面 Step2 + Step3 合并写法`;

  const practicePair = codeBlocksRow([
    codeBlock('综合：filter + groupBy + Top2', 'dot-green', 'java', practiceCode),
    codeBlock('拆解步骤', 'dot-blue', 'java', practiceStepCode),
  ]);

  const practiceNote = ruleBox('warning',
    `<strong>Stream 性能注意事项：</strong><br><br>
    <strong>① 不要对小集合过度使用 Stream</strong><br>
    10 条以内的数据用普通 for 循环更直观、性能更好；Stream 的价值在于大数据量 + 复杂管道的可读性。<br><br>
    <strong>② parallelStream 不是银弹</strong><br>
    并行流有线程拆分和合并开销，只有数据量足够大（通常 > 10000）且操作无状态时才有收益；
    有共享状态（修改外部变量）时会有线程安全问题。<br><br>
    <strong>③ collect(toList()) vs toList()（Java 16+）</strong><br>
    Java 16 起可以直接 <code>.toList()</code> 代替 <code>.collect(Collectors.toList())</code>，
    返回不可变 List。如果后续需要修改列表，仍要用 <code>Collectors.toList()</code> 或 <code>new ArrayList<>(stream.toList())</code>。`);

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('过滤（filter / findFirst / match）', filterSetupBlock + filterPair + filterJsBlock + filterNote)}
    ${section('分组（Collectors.groupingBy）', groupingByPair + groupingByJsBlock + groupingByNote)}
    ${section('统计（count / sum / groupingBy + 统计）', statisticsPair + statisticsReduceBlock + statisticsJsBlock)}
    ${section('综合实战：订单分类 Top2 报表', practicePair + practiceNote)}`);
}
