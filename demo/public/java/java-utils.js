function renderJavaUtils(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>Java 内置工具类覆盖了前端常用的 lodash / dayjs / 数组方法，不需要引额外库。</strong><br><br>
    • <strong>Optional</strong>——替代 <code>null</code> 判断，对标前端的可选链 <code>?.</code><br>
    • <strong>Stream API</strong>——集合的 map / filter / reduce，对标 <code>Array.prototype</code> 方法<br>
    • <strong>LocalDateTime</strong>——日期时间处理，对标 <code>dayjs</code><br>
    • <strong>Objects / Collections / StringUtils</strong>——空值判断、集合操作、字符串工具`);

  // ── Optional ──────────────────────────────────────────────────────────────────

  const optionalBox = ruleBox('success',
    `<strong>Optional——消灭 NullPointerException</strong><br><br>
    前端用可选链 <code>user?.address?.city</code> 避免 <code>cannot read property of null</code>。
    Java 用 <code>Optional</code> 包装可能为 null 的值，强迫调用方显式处理空值情况，避免 NPE。`);

  const optionalBad = `// ❌ 传统写法：层层判空，容易遗漏
public String getCityName(Long userId) {
  User user = userMapper.selectById(userId);
  if (user == null) return "未知";
  Address address = user.getAddress();
  if (address == null) return "未知";
  String city = address.getCity();
  if (city == null) return "未知";
  return city;
}`;

  const optionalGood = `// ✅ Optional 链式写法
public String getCityName(Long userId) {
  return Optional.ofNullable(userMapper.selectById(userId))
      .map(User::getAddress)           // user 不为 null 才执行
      .map(Address::getCity)           // address 不为 null 才执行
      .orElse("未知");                 // 任意一步为 null 都返回"未知"
}

// 常用 API 速查
Optional<User> opt = Optional.ofNullable(user);

opt.isPresent()                        // 是否有值（等价于 != null）
opt.isEmpty()                          // 是否为空（Java 11+）
opt.get()                              // 取值（为空则抛异常，慎用）
opt.orElse(defaultValue)               // 为空时返回默认值
opt.orElseGet(() -> computeDefault())  // 为空时执行 Supplier（懒计算）
opt.orElseThrow(() -> new NotFoundException("not found"))
opt.ifPresent(u -> log.info(u.getName()))  // 有值时执行消费者
opt.filter(u -> u.getAge() > 18)           // 满足条件才保留，否则变空`;

  const optionalPair = codeBlocksRow([
    codeBlock('❌ 传统 null 判断', 'dot-red', 'java', optionalBad),
    codeBlock('✅ Optional 链式写法', 'dot-green', 'java', optionalGood),
  ]);

  // ── Stream API ────────────────────────────────────────────────────────────────

  const streamBox = ruleBox('success',
    `<strong>Stream API——集合操作的函数式写法</strong><br><br>
    前端：<code>arr.filter().map().reduce()</code><br>
    Java：<code>list.stream().filter().map().collect()</code><br><br>
    Stream 是<strong>惰性求值</strong>的（中间操作不立即执行），只有遇到终止操作（<code>collect</code>、<code>forEach</code>、<code>count</code> 等）才触发计算。`);

  const streamCompare = `// 前端
const names = users
  .filter(u => u.age >= 18)
  .map(u => u.name)
  .sort();

// Java（等价写法）
List<String> names = users.stream()
    .filter(u -> u.getAge() >= 18)
    .map(User::getName)
    .sorted()
    .collect(Collectors.toList());  // Java 16+ 可用 .toList()`;

  const streamOps = `// ── 常用中间操作 ──────────────────────────────────────────────────
list.stream()
    .filter(x -> x > 0)            // 过滤，对标 .filter()
    .map(x -> x * 2)               // 转换，对标 .map()
    .mapToInt(String::length)      // 转为基本类型 Stream
    .flatMap(Collection::stream)   // 展平嵌套集合，对标 .flatMap()
    .distinct()                    // 去重，对标 new Set()
    .sorted()                      // 自然排序
    .sorted(Comparator.comparing(User::getAge).reversed()) // 自定义排序
    .limit(10)                     // 取前 N 个，对标 .slice(0, 10)
    .skip(5)                       // 跳过前 N 个
    .peek(x -> log.debug("{}", x)) // 调试用，不修改元素

// ── 常用终止操作 ──────────────────────────────────────────────────
.collect(Collectors.toList())      // 收集为 List
.collect(Collectors.toSet())       // 收集为 Set
.collect(Collectors.joining(", ")) // 字符串拼接，对标 .join(', ')
.collect(Collectors.groupingBy(User::getDept))  // 分组，返回 Map<Dept, List<User>>
.collect(Collectors.counting())    // 计数
.count()                           // 总数
.findFirst()                       // 第一个，返回 Optional
.anyMatch(x -> x > 0)             // 任一满足，对标 .some()
.allMatch(x -> x > 0)             // 全部满足，对标 .every()
.noneMatch(x -> x < 0)            // 全不满足
.min(Comparator.naturalOrder())    // 最小值，返回 Optional
.max(Comparator.naturalOrder())    // 最大值，返回 Optional
.reduce(0, Integer::sum)           // 归约，对标 .reduce()
.forEach(System.out::println)      // 遍历，对标 .forEach()`;

  const streamPair = codeBlocksRow([
    codeBlock('前端 vs Java Stream 对比', 'dot-blue', 'javascript', streamCompare),
    codeBlock('中间操作 & 终止操作速查', 'dot-green', 'java', streamOps),
  ]);

  const streamAdvanced = `// ── 实战常用模式 ──────────────────────────────────────────────────

// 1. List → Map（id 做 key）
Map<Long, User> userMap = users.stream()
    .collect(Collectors.toMap(User::getId, u -> u));

// 2. 按字段分组
Map<String, List<User>> byDept = users.stream()
    .collect(Collectors.groupingBy(User::getDept));

// 3. 统计各部门人数
Map<String, Long> deptCount = users.stream()
    .collect(Collectors.groupingBy(User::getDept, Collectors.counting()));

// 4. 求和 / 平均值
int totalAge = users.stream()
    .mapToInt(User::getAge).sum();
OptionalDouble avgAge = users.stream()
    .mapToDouble(User::getAge).average();

// 5. 多字段排序
users.sort(Comparator.comparing(User::getDept)
    .thenComparing(User::getAge)
    .thenComparing(Comparator.comparing(User::getName).reversed()));

// 6. 并行流（大数据量时提速，注意线程安全）
long count = bigList.parallelStream()
    .filter(x -> x.isActive())
    .count();`;

  const streamAdvancedBlock = codeBlock('Stream 实战常用模式', 'dot-orange', 'java', streamAdvanced);

  // ── LocalDateTime ─────────────────────────────────────────────────────────────

  const dateBox = ruleBox('info',
    `<strong>LocalDateTime——线程安全的日期时间 API（Java 8+）</strong><br><br>
    旧版 <code>Date</code> 和 <code>Calendar</code> 线程不安全、API 难用。
    Java 8 引入的 <code>LocalDate</code> / <code>LocalTime</code> / <code>LocalDateTime</code> / <code>ZonedDateTime</code> 完全替代它们，
    对标前端的 <code>dayjs</code>。`);

  const dateCode = `// ── 创建 ──────────────────────────────────────────────────────
LocalDateTime now    = LocalDateTime.now();           // 当前时间
LocalDate today      = LocalDate.now();               // 今天日期（无时间）
LocalDateTime fixed  = LocalDateTime.of(2024, 1, 15, 10, 30, 0);

// ── 格式化（对标 dayjs().format()）────────────────────────────
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String str = now.format(fmt);                         // "2024-01-15 10:30:00"
LocalDateTime parsed = LocalDateTime.parse(str, fmt); // 字符串 → 对象

// ── 加减运算（不可变，返回新对象）────────────────────────────
LocalDateTime tomorrow    = now.plusDays(1);
LocalDateTime lastMonth   = now.minusMonths(1);
LocalDateTime nextHour    = now.plusHours(1);

// ── 比较 ───────────────────────────────────────────────────────
now.isBefore(tomorrow)    // true
now.isAfter(lastMonth)    // true
now.isEqual(now)          // true

// ── 提取字段 ──────────────────────────────────────────────────
now.getYear()             // 2024
now.getMonthValue()       // 1（1月，不是 0 开头）
now.getDayOfMonth()       // 15
now.getDayOfWeek()        // MONDAY（枚举）
now.getHour()             // 10

// ── 计算时间差 ────────────────────────────────────────────────
long days = ChronoUnit.DAYS.between(LocalDate.of(2024,1,1), today);
Duration duration = Duration.between(fixed, now);
long minutes = duration.toMinutes();

// ── 与时间戳互转（跨系统传输用 Instant）────────────────────
Instant instant = now.atZone(ZoneId.systemDefault()).toInstant();
long epochMilli = instant.toEpochMilli();             // 毫秒时间戳
LocalDateTime fromTs = LocalDateTime.ofInstant(
    Instant.ofEpochMilli(epochMilli), ZoneId.systemDefault());`;

  const dateBlock = codeBlock('LocalDateTime 常用操作', 'dot-blue', 'java', dateCode);

  // ── Objects / Collections / StringUtils ──────────────────────────────────────

  const utilsCode = `// ── Objects（java.util.Objects）──────────────────────────────
Objects.isNull(obj)                    // == null
Objects.nonNull(obj)                   // != null
Objects.requireNonNull(obj, "msg")     // 为 null 抛 NPE，类似断言
Objects.toString(obj, "default")       // null 时返回默认值
Objects.equals(a, b)                   // null 安全的 equals，对标 a === b

// ── Collections（java.util.Collections）──────────────────────
Collections.emptyList()                // 不可变空 List（比 new ArrayList<> 更省内存）
Collections.singletonList(item)        // 只含一个元素的不可变 List
Collections.unmodifiableList(list)     // 包装为只读 List
Collections.sort(list)                 // 原地排序（同 list.sort(null)）
Collections.reverse(list)              // 原地翻转
Collections.shuffle(list)              // 随机打乱
Collections.frequency(list, elem)      // 统计元素出现次数
Collections.disjoint(list1, list2)     // 两个集合是否没有交集
Collections.min(list) / Collections.max(list)

// ── StringUtils（Apache Commons / Spring）────────────────────
// Spring 内置：org.springframework.util.StringUtils
StringUtils.hasText(str)               // 非 null 且非空白（最常用的判空）
StringUtils.hasLength(str)             // 非 null 且长度 > 0
StringUtils.trimWhitespace(str)        // 去除首尾空白

// Apache Commons Lang（需依赖 commons-lang3）
// org.apache.commons.lang3.StringUtils
StringUtils.isBlank(str)               // null / 空 / 全空白
StringUtils.isNotBlank(str)            // 非 null 且非空白
StringUtils.isEmpty(str)               // null 或 ""
StringUtils.defaultIfBlank(str, "N/A") // 空白时返回默认值
StringUtils.join(list, ", ")           // 集合拼接字符串
StringUtils.split(str, ",")            // 字符串分割为数组
StringUtils.capitalize("hello")        // "Hello"（首字母大写）
StringUtils.leftPad("5", 3, "0")      // "005"（左填充）`;

  const utilsBlock = codeBlock('Objects / Collections / StringUtils 速查', 'dot-orange', 'java', utilsCode);

  // ── 工具对比表 ────────────────────────────────────────────────────────────────

  const compareRows = [
    ['arr.filter(fn)',              'stream().filter(fn).collect()',   '筛选元素'],
    ['arr.map(fn)',                 'stream().map(fn).collect()',      '转换元素'],
    ['arr.find(fn)',                'stream().filter(fn).findFirst()', '查找第一个，返回 Optional'],
    ['arr.some(fn)',                'stream().anyMatch(fn)',           '任一满足'],
    ['arr.every(fn)',               'stream().allMatch(fn)',           '全部满足'],
    ['arr.reduce(fn, init)',        'stream().reduce(init, fn)',       '归约'],
    ['arr.flat()',                  'stream().flatMap(...)',           '展平嵌套'],
    ['[...new Set(arr)]',          'stream().distinct().collect()',   '去重'],
    ['obj?.a?.b',                  'Optional.ofNullable(obj).map()', '安全取值'],
    ['dayjs().format()',            'LocalDateTime.format()',         '日期格式化'],
    ['dayjs().add(1, \'day\')',    'now.plusDays(1)',                 '日期加减'],
    ['str ?? \'default\'',         'Objects.toString(str, "default")','空值默认'],
  ];

  const compareHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.8fr 1.4fr">
      <div class="compare-card-header-cell frontend">前端（JS）</div>
      <div class="compare-card-header-cell java">Java</div>
      <div class="compare-card-header-cell desc">用途</div>
    </div>`;

  const compareRowsHtml = compareRows.map(([fe, java, desc]) => `
    <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.8fr 1.4fr">
      <div class="compare-card-cell frontend">${escHtml(fe)}</div>
      <div class="compare-card-cell java">${escHtml(java)}</div>
      <div class="compare-card-cell desc">${escHtml(desc)}</div>
    </div>`).join('');

  const compareTable = `<div class="compare-card">${compareHeaderHtml}${compareRowsHtml}</div>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('Optional——消灭 NullPointerException', optionalBox + optionalPair)}
    ${section('Stream API——集合的函数式操作', streamBox + streamPair + streamAdvancedBlock)}
    ${section('LocalDateTime——日期时间处理', dateBox + dateBlock)}
    ${section('Objects / Collections / StringUtils', utilsBlock)}
    ${section('前端 vs Java 工具对照表', compareTable)}`);
}
