function renderJavaLambda(t) {
  // ── Section 1：结论 ────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>Lambda 是 Java 8 最重要的特性，本质是「匿名函数」——可以赋值给变量、作为参数传递、作为返回值。</strong><br><br>
    ① <strong>Lambda</strong>：简化匿名内部类，把一段行为（代码块）当成数据传递；<br>
    ② <strong>函数式接口</strong>：只有一个抽象方法的接口，是 Lambda 的「类型容器」；<br>
    ③ <strong>方法引用</strong>：Lambda 的进一步简写，直接引用已有方法；<br>
    ④ <strong>四大内置接口</strong>：<code>Function / Predicate / Consumer / Supplier</code> 覆盖 99% 场景。<br><br>
    与前端箭头函数的关系：Java Lambda <code>(x) -> x * 2</code> ≈ JS <code>x => x * 2</code>，核心思想完全相同。`);

  // ── Section 2：Lambda 语法 ─────────────────────────────────────────────────

  const lambdaSyntaxCode = `// Lambda 语法：(参数列表) -> { 方法体 }
// 可以省略参数类型（编译器推断），单行可省略花括号和 return

// ① 无参数
Runnable r = () -> System.out.println("hello");

// ② 单参数（括号可省略）
Consumer<String> print = s -> System.out.println(s);

// ③ 多参数
Comparator<Integer> cmp = (a, b) -> a - b;

// ④ 多行方法体
Function<Integer, String> describe = n -> {
    if (n > 0) return "正数";
    if (n < 0) return "负数";
    return "零";
};

// ⑤ 有返回值的单行（自动 return）
Function<Integer, Integer> doubleIt = n -> n * 2;`;

  const lambdaJsCode = `// 前端箭头函数对照

// ① 无参数
const r = () => console.log('hello');

// ② 单参数
const print = s => console.log(s);

// ③ 多参数
const cmp = (a, b) => a - b;

// ④ 多行
const describe = n => {
  if (n > 0) return '正数';
  if (n < 0) return '负数';
  return '零';
};

// ⑤ 单行自动 return
const doubleIt = n => n * 2;

// 结论：Java Lambda 和 JS 箭头函数语法几乎一一对应
// 区别：Java 需要声明变量类型（函数式接口），JS 用 const/let`;

  const syntaxPair = codeBlocksRow([
    codeBlock('Java Lambda 语法', 'dot-blue', 'java', lambdaSyntaxCode),
    codeBlock('JS 箭头函数对照', 'dot-orange', 'javascript', lambdaJsCode),
  ]);

  const lambdaBeforeCode = `// ❌ Java 8 之前：匿名内部类，冗长且噪音多
List<String> names = Arrays.asList("Charlie", "Alice", "Bob");

Collections.sort(names, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.compareTo(b);
    }
});

// 传递行为给线程
new Thread(new Runnable() {
    @Override
    public void run() {
        System.out.println("running");
    }
}).start();`;

  const lambdaAfterCode = `// ✅ Java 8 Lambda：行为即数据，简洁直接
List<String> names = Arrays.asList("Charlie", "Alice", "Bob");

// Comparator 是函数式接口，直接传 Lambda
Collections.sort(names, (a, b) -> a.compareTo(b));
// 更简洁：方法引用
Collections.sort(names, String::compareTo);

// 线程
new Thread(() -> System.out.println("running")).start();

// Stream API 中大量使用 Lambda
names.stream()
     .filter(n -> n.startsWith("A"))
     .map(String::toUpperCase)
     .forEach(System.out::println);`;

  const beforeAfterPair = codeBlocksRow([
    codeBlock('❌ 匿名内部类（Java 8 之前）', 'dot-red', 'java', lambdaBeforeCode),
    codeBlock('✅ Lambda（Java 8+）', 'dot-green', 'java', lambdaAfterCode),
  ]);

  // ── Section 3：函数式接口 ─────────────────────────────────────────────────

  const functionalInterfaceCode = `// @FunctionalInterface：只有一个抽象方法的接口
// 编译器会检查：多于一个抽象方法则报错

@FunctionalInterface
public interface Validator<T> {
    boolean validate(T value);   // 唯一抽象方法
    // 可以有 default 方法和 static 方法，不影响函数式接口资格
    default Validator<T> and(Validator<T> other) {
        return value -> this.validate(value) && other.validate(value);
    }
}

// 使用：把 Lambda 赋值给函数式接口变量
Validator<String> notEmpty = s -> !s.isEmpty();
Validator<String> notTooLong = s -> s.length() <= 20;

// 组合：用 default 方法链式调用
Validator<String> combined = notEmpty.and(notTooLong);
System.out.println(combined.validate("hello"));   // true
System.out.println(combined.validate(""));         // false`;

  const functionalInterfaceBlock = codeBlock('@FunctionalInterface 自定义示例', 'dot-blue', 'java', functionalInterfaceCode);

  const functionalInterfaceNote = ruleBox('success',
    `<strong>Lambda 能赋值给函数式接口的原理：</strong><br>
    编译器看到 <code>Validator&lt;String&gt; v = s -> !s.isEmpty()</code> 时，
    自动把 Lambda 包装成实现了 <code>Validator</code> 接口的匿名类实例——
    Lambda 的方法体就是 <code>validate()</code> 方法的实现。<br><br>
    <strong>前端类比：</strong>就像 TypeScript 的函数类型签名 <code>type Validator = (s: string) => boolean</code>，
    函数式接口就是 Java 版的函数类型。`);

  // ── Section 4：四大内置接口 ───────────────────────────────────────────────

  const fourInterfacesTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">接口</div>
        <div class="compare-card-header-cell java">抽象方法签名</div>
        <div class="compare-card-header-cell desc">用途 / 前端类比</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>Function&lt;T, R&gt;</code></div>
        <div class="compare-card-cell java"><code>R apply(T t)</code></div>
        <div class="compare-card-cell desc">输入 T，返回 R（转换）≈ <code>arr.map(fn)</code></div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>Predicate&lt;T&gt;</code></div>
        <div class="compare-card-cell java"><code>boolean test(T t)</code></div>
        <div class="compare-card-cell desc">输入 T，返回 boolean（判断）≈ <code>arr.filter(fn)</code></div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>Consumer&lt;T&gt;</code></div>
        <div class="compare-card-cell java"><code>void accept(T t)</code></div>
        <div class="compare-card-cell desc">输入 T，无返回（副作用）≈ <code>arr.forEach(fn)</code></div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>Supplier&lt;T&gt;</code></div>
        <div class="compare-card-cell java"><code>T get()</code></div>
        <div class="compare-card-cell desc">无输入，返回 T（工厂/懒加载）≈ <code>() => value</code></div>
      </div>
    </div>`;

  const functionCode = `// Function<T, R>：T → R 的转换
Function<String, Integer> strLen = s -> s.length();
Function<Integer, String> intToStr = n -> "number: " + n;

// andThen：组合，f.andThen(g) = g(f(x))
Function<String, String> pipeline = strLen.andThen(intToStr);
System.out.println(pipeline.apply("hello"));  // "number: 5"

// 在 Stream 中：.map() 接受 Function
List<Integer> lengths = List.of("a", "bb", "ccc")
    .stream()
    .map(String::length)   // Function<String, Integer>
    .collect(Collectors.toList());  // [1, 2, 3]

// BiFunction<T, U, R>：两个参数的 Function
BiFunction<String, Integer, String> repeat = (s, n) -> s.repeat(n);
System.out.println(repeat.apply("ab", 3));  // "ababab"`;

  const predicateCode = `// Predicate<T>：返回 boolean 的判断条件
Predicate<String> notEmpty  = s -> !s.isEmpty();
Predicate<String> shortStr  = s -> s.length() < 5;

// and / or / negate：条件组合
Predicate<String> valid = notEmpty.and(shortStr);
Predicate<String> invalid = valid.negate();

System.out.println(valid.test("hi"));     // true
System.out.println(valid.test(""));       // false
System.out.println(valid.test("toolong")); // false

// 在 Stream 中：.filter() 接受 Predicate
List<String> result = List.of("", "hi", "toolong", "ok")
    .stream()
    .filter(notEmpty.and(shortStr))
    .collect(Collectors.toList());  // ["hi", "ok"]`;

  const consumerSupplierCode = `// Consumer<T>：消费，无返回值
Consumer<String> log = msg -> System.out.println("[LOG] " + msg);
Consumer<String> save = msg -> db.save(msg);

// andThen：顺序执行两个 Consumer
Consumer<String> logAndSave = log.andThen(save);
logAndSave.accept("user login");  // 先打日志，再存库

// 在 Stream 中：.forEach() 接受 Consumer
List.of("a", "b", "c").forEach(System.out::println);

// ─────────────────────────────────────────────

// Supplier<T>：生产，无参数
Supplier<List<String>> listFactory = ArrayList::new;
Supplier<LocalDateTime> now = LocalDateTime::now;

// 懒加载场景：值只在真正需要时才计算
Supplier<String> expensiveValue = () -> computeExpensiveString();
// 不调用 get()，computeExpensiveString() 不会执行
if (needValue) {
    String val = expensiveValue.get();  // 此时才执行
}`;

  const functionBlock = codeBlock('Function<T,R> — 转换', 'dot-blue', 'java', functionCode);
  const predicateBlock = codeBlock('Predicate<T> — 判断', 'dot-green', 'java', predicateCode);
  const consumerSupplierBlock = codeBlock('Consumer<T> + Supplier<T>', 'dot-orange', 'java', consumerSupplierCode);

  const fourInterfacesNote = ruleBox('info',
    `<strong>记忆口诀：</strong><br>
    <code>Function</code> = 有进有出（map）；
    <code>Predicate</code> = 进去出 boolean（filter）；
    <code>Consumer</code> = 进去不出来（forEach）；
    <code>Supplier</code> = 不进来出去（factory/lazy）。<br><br>
    变体：<code>BiFunction&lt;T,U,R&gt;</code>（两个参数）、<code>UnaryOperator&lt;T&gt;</code>（T → T）、
    <code>BinaryOperator&lt;T&gt;</code>（T,T → T）、<code>IntFunction / LongFunction</code>（基本类型优化版）。`);

  // ── Section 5：方法引用 ───────────────────────────────────────────────────

  const methodRefCode = `// 方法引用是 Lambda 的语法糖，四种形式

// ① 静态方法引用：ClassName::staticMethod
// Lambda:          n -> Integer.parseInt(n)
Function<String, Integer> parse = Integer::parseInt;

// ② 实例方法引用（特定实例）：instance::method
String prefix = "Hello, ";
// Lambda:          s -> prefix.concat(s)
Function<String, String> greet = prefix::concat;

// ③ 实例方法引用（任意实例）：ClassName::instanceMethod
// Lambda:          s -> s.toUpperCase()
Function<String, String> upper = String::toUpperCase;
// Lambda:          (a, b) -> a.compareTo(b)
Comparator<String> cmp = String::compareTo;

// ④ 构造方法引用：ClassName::new
// Lambda:          () -> new ArrayList<>()
Supplier<List<String>> listFactory = ArrayList::new;
// Lambda:          name -> new User(name)
Function<String, User> userFactory = User::new;`;

  const methodRefUsageCode = `// 方法引用在 Stream 中的实际应用

List<String> names = List.of("alice", "bob", "charlie");

// ① 静态方法：String.valueOf
List<Integer> lengths = names.stream()
    .map(String::length)           // ③ 任意实例方法
    .collect(Collectors.toList()); // [5, 3, 7]

// ④ 构造方法引用：收集为特定集合类型
names.stream()
     .collect(Collectors.toCollection(ArrayList::new));

// ① + ③ 混合使用
names.stream()
     .map(String::toUpperCase)     // "ALICE", "BOB", "CHARLIE"
     .forEach(System.out::println); // ② 特定实例方法引用

// 排序
names.stream()
     .sorted(String::compareToIgnoreCase)  // ③
     .collect(Collectors.toList());`;

  const methodRefPair = codeBlocksRow([
    codeBlock('四种方法引用形式', 'dot-blue', 'java', methodRefCode),
    codeBlock('Stream 中实际应用', 'dot-green', 'java', methodRefUsageCode),
  ]);

  const methodRefNote = ruleBox('success',
    `<strong>什么时候用方法引用？</strong>当 Lambda 体只是「直接调用一个已有方法」时就可以换成方法引用，让代码更易读。<br>
    判断标准：<code>x -> foo(x)</code> → <code>SomeClass::foo</code>；如果 Lambda 内有额外逻辑（<code>x -> foo(x) + 1</code>），就不能替换。<br><br>
    <strong>前端类比：</strong><code>String::toUpperCase</code> ≈ JS 中 <code>.map(s => s.toUpperCase())</code> 简写为 <code>.map(String.prototype.toUpperCase.bind(s))</code>——
    实际开发中 JS 不这么写，但 Java 这种写法非常普遍。`);

  // ── Section 6：实战：策略模式 ─────────────────────────────────────────────

  const strategyCode = `// Lambda 替代策略模式：行为作为参数传递

// 传统策略模式需要定义接口 + 多个实现类
// Lambda 直接把「策略」作为参数传进来

public class OrderProcessor {

    // 接受 Function 作为参数：折扣计算策略
    public BigDecimal calcPrice(BigDecimal original,
                                Function<BigDecimal, BigDecimal> discountStrategy) {
        return discountStrategy.apply(original);
    }

    // 接受 Predicate 作为参数：订单过滤策略
    public List<Order> filterOrders(List<Order> orders,
                                    Predicate<Order> condition) {
        return orders.stream()
                     .filter(condition)
                     .collect(Collectors.toList());
    }
}

// 调用时直接传 Lambda，无需额外的策略实现类
OrderProcessor processor = new OrderProcessor();

BigDecimal price = processor.calcPrice(
    new BigDecimal("100"),
    p -> p.multiply(new BigDecimal("0.9"))  // 9 折策略
);

List<Order> vipOrders = processor.filterOrders(orders,
    order -> order.getUserLevel() >= 3      // VIP 过滤策略
);`;

  const strategyFrontendCode = `// 前端中「函数作为参数」非常普遍
// Java Lambda 和这里完全对等

// React：事件处理函数作为 prop 传递
<Button onClick={() => handleDelete(id)} />

// Array 方法：策略作为参数
const vipOrders = orders.filter(o => o.userLevel >= 3);
const prices    = orders.map(o => o.total * 0.9);

// 自定义 hook：接受回调
function useDebounce(fn, delay) {
  // fn 就是 Consumer<Event> 的前端版本
  return useCallback(debounce(fn, delay), [fn]);
}

// 结论：
// Java Lambda/函数式接口 = 前端「回调函数 / 高阶函数」的类型安全版本
// 核心思想相同：把行为作为数据传递，解耦调用方和实现方`;

  const strategyPair = codeBlocksRow([
    codeBlock('Java：Lambda 作为策略参数', 'dot-blue', 'java', strategyCode),
    codeBlock('前端类比：函数作为 prop / 回调', 'dot-orange', 'javascript', strategyFrontendCode),
  ]);

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('Lambda 语法', syntaxPair + beforeAfterPair)}
    ${section('函数式接口（@FunctionalInterface）', functionalInterfaceBlock + functionalInterfaceNote)}
    ${section('四大内置函数式接口', fourInterfacesTable + functionBlock + predicateBlock + consumerSupplierBlock + fourInterfacesNote)}
    ${section('方法引用（::）', methodRefPair + methodRefNote)}
    ${section('实战：Lambda 替代策略模式', strategyPair)}`);
}
