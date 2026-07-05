function renderJavaBasicsFundamentals(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>Java 是"纯"面向对象语言——一切皆对象（基本类型除外），类是组织代码的唯一单位。</strong><br><br>
    ① <strong>数据类型</strong>：基本类型（8 种）+ 引用类型，强类型、值传递——Java 一切严谨的起点；<br>
    ② <strong>封装 / 继承 / 多态</strong>是三大基石，对应前端的"模块作用域 / 组合 / 接口约定"；<br>
    ③ <strong>重载（Overload）vs 重写（Override）</strong>：同名方法的不同形态——编译期匹配 vs 运行期分派；<br>
    ④ <strong>虚方法表（vtable）</strong>：JVM 实现多态的底层机制，决定运行时调用哪个类的方法；<br>
    ⑤ <strong>内存分配</strong>：局部变量在栈、对象在堆、类元信息在元空间——理解了这块才能看懂 GC；<br>
    ⑥ <strong>static / final / private</strong>：控制"归属 / 不可变 / 可见性"的三大修饰符；<br>
    ⑦ <strong>枚举（enum）</strong>：本质是继承自 <code>java.lang.Enum</code> 的 final 类，是单例模式的语法糖。`);

  // ── Java 数据类型 ────────────────────────────────────────────────────────────

  const dataTypeBox = ruleBox('info',
    `<strong>Java 是强类型语言——每个变量必须声明类型，编译期确定，运行期不可变。</strong><br><br>
    数据类型分两大类：<br>
    ① <strong>基本类型（Primitive）</strong>：8 种内置类型，存于栈，按值传递<br>
    ② <strong>引用类型（Reference）</strong>：类、接口、数组、枚举，存于堆，按引用地址传递<br><br>
    <strong>前端类比：</strong>TS 的 <code>boolean / number / string</code> 对应 Java 基本类型，
    <code>object / array / class</code> 对应引用类型——但 Java 的基本类型<strong>不是对象</strong>，
    <code>int</code> 和 <code>Integer</code> 是两个东西。`);

  const primitiveTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">类型</div>
        <div class="compare-card-header-cell java">字节 / 范围</div>
        <div class="compare-card-header-cell desc">前端对照 / 备注</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>byte</code></div>
        <div class="compare-card-cell java">1 字节 / -128~127</div>
        <div class="compare-card-cell desc">无前端对应，二进制流处理用</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>short</code></div>
        <div class="compare-card-cell java">2 字节 / ±3.2 万</div>
        <div class="compare-card-cell desc">很少用</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>int</code></div>
        <div class="compare-card-cell java">4 字节 / ±21 亿</div>
        <div class="compare-card-cell desc">默认整数类型 ≈ TS <code>number</code>（精度更严格）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>long</code></div>
        <div class="compare-card-cell java">8 字节 / ±9.2e18</div>
        <div class="compare-card-cell desc">大整数，字面量加 <code>L</code> 后缀</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>float</code></div>
        <div class="compare-card-cell java">4 字节 / IEEE 754</div>
        <div class="compare-card-cell desc">单精度浮点，字面量加 <code>f</code> 后缀</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>double</code></div>
        <div class="compare-card-cell java">8 字节 / IEEE 754</div>
        <div class="compare-card-cell desc">默认浮点类型 ≈ TS <code>number</code></div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>char</code></div>
        <div class="compare-card-cell java">2 字节 / UTF-16</div>
        <div class="compare-card-cell desc">单个 Unicode 字符，单引号 <code>'A'</code></div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>boolean</code></div>
        <div class="compare-card-cell java">JVM 实现相关 / true|false</div>
        <div class="compare-card-cell desc">≈ TS <code>boolean</code>，不能与 int 互转</div>
      </div>
    </div>`;

  const primitiveCode = `// 基本类型：8 种内置类型
byte    b = 100;              // 1 字节
short   s = 1000;             // 2 字节
int     i = 100000;           // 4 字节，默认整数类型
long    l = 100000L;          // 8 字节，字面量加 L 后缀
float   f = 3.14f;            // 4 字节，字面量加 f 后缀
double  d = 3.14159;          // 8 字节，默认浮点类型
char    c = 'A';              // 2 字节，UTF-16 字符
boolean ok = true;            // true / false

// 字面量进制
int hex = 0xFF;               // 16 进制
int bin = 0b1010;             // 2 进制（Java 7+）
int withUnderscore = 1_000_000;  // 下划线分隔（Java 7+）

// ⚠️ 基本类型不是对象！
// int n = 5; n.toString();  // ❌ 编译错误
// 必须用包装类：Integer.toString(n)`;

  const primitiveBlock = codeBlock('8 种基本类型', 'dot-blue', 'java', primitiveCode);

  const referenceCode = `// 引用类型：类、接口、数组、枚举
String name = "Phil";                  // String 是类（引用类型）
int[] nums = {1, 2, 3};                // 数组也是对象
List<String> list = new ArrayList<>(); // 集合
Object obj = new Object();             // 所有类的根

// 基本类型 vs 引用类型：默认值
public class DefaultValues {
    int i;                  // 默认 0（实例变量）
    boolean b;              // 默认 false
    String s;               // 默认 null（引用类型）
    int[] arr;              // 默认 null
    // 局部变量没有默认值，必须显式赋值，否则编译错误
}

// == 比较：
//   基本类型 → 比较值
//   引用类型 → 比较地址（是否同一个对象）→ 引用类型必须用 .equals() 比内容`;

  const referenceBlock = codeBlock('引用类型与默认值', 'dot-orange', 'java', referenceCode);

  const boxingCode = `// 包装类：每种基本类型都有对应的包装类（首字母大写）
// byte→Byte, short→Short, int→Integer, long→Long
// float→Float, double→Double, char→Character, boolean→Boolean

Integer a = 100;             // 自动装箱：int → Integer（编译器插入 Integer.valueOf(100)）
int b = a;                   // 自动拆箱：Integer → int（编译器插入 a.intValue()）

// ⚠️ Integer 缓存陷阱：-128~127 范围内的 Integer 是缓存对象
Integer x = 100;
Integer y = 100;
System.out.println(x == y);       // true（缓存命中，同一对象）

Integer m = 200;
Integer n = 200;
System.out.println(m == n);       // false（超出缓存，不同对象）
System.out.println(m.equals(n));  // true（值相等，引用类型必须用 equals）

// 集合只能装对象，不能装基本类型
List<Integer> list = new ArrayList<>();     // ✅
list.add(1);                                // 自动装箱
// List<int> badList = new ArrayList<>();   // ❌ 编译错误`;

  const boxingBlock = codeBlock('自动装箱 / 拆箱与 Integer 缓存', 'dot-yellow', 'java', boxingCode);

  const passByValueCode = `// Java 始终是"值传递"——但引用类型的"值"是地址
public class PassTest {
    public static void modifyPrimitive(int x) {
        x = 999;                          // 改的是副本，不影响原值
    }

    public static void modifyArray(int[] arr) {
        arr[0] = 999;                     // 通过地址改内容，影响原数组
    }

    public static void reassignArray(int[] arr) {
        arr = new int[]{888};             // 改的是副本地址，不影响原引用
    }

    public static void main(String[] args) {
        int n = 1;
        modifyPrimitive(n);
        System.out.println(n);            // → 1（未变）

        int[] a = {1, 2, 3};
        modifyArray(a);
        System.out.println(a[0]);         // → 999（内容被改）

        reassignArray(a);
        System.out.println(a[0]);         // → 999（引用未变，仍指向原数组）
    }
}`;

  const passByValueBlock = codeBlock('Java 是值传递（关键易错点）', 'dot-red', 'java', passByValueCode);

  const passByValueNote = ruleBox('warning',
    `<strong>Java 是"值传递"，没有引用传递。</strong><br><br>
    ① <strong>基本类型</strong>：传值的副本，方法内改不影响外部<br>
    ② <strong>引用类型</strong>：传<strong>地址的副本</strong>，方法内通过地址修改内容会影响外部，但重新赋值地址不影响外部<br><br>
    <strong>前端类比：</strong>JS 完全一样——基本类型按值，对象按"引用的副本"。
    理解这一点就不会被 <code>Integer</code> 缓存、<code>String</code> 不可变等细节坑到。`);

  // ── 面向对象三大特性 ─────────────────────────────────────────────────────────

  const oopBox = ruleBox('info',
    `<strong>前端视角看 Java OOP：</strong>前端用"模块 + 组合 + 约定"组织代码，Java 用"类 + 继承 + 多态"组织代码。
    封装≈模块作用域，继承≈extends/compose，多态≈接口约定 + 运行时替换实现。`);

  const encapsulationCode = `// 封装：把状态藏在对象内部，只暴露方法
public class Account {
    private double balance;   // 私有字段：外部不能直接改

    public Account(double init) { this.balance = init; }

    public void deposit(double amt) {           // 公开方法：受控访问
        if (amt <= 0) throw new IllegalArgumentException("amt 必须为正");
        balance += amt;
    }
    public double getBalance() { return balance; }
}

// 外部代码
Account acc = new Account(100);
acc.deposit(50);
// acc.balance = -999;  // ❌ 编译错误：private 不可见，只能通过 deposit 改`;

  const encapsulationJs = `// 前端封装：闭包 + 模块作用域
function createAccount(init) {
  let balance = init;                          // 私有：闭包内

  return {
    deposit(amt) {
      if (amt <= 0) throw new Error('amt 必须为正');
      balance += amt;
    },
    getBalance() { return balance; }
  };
}

const acc = createAccount(100);
acc.deposit(50);
// acc.balance = -999;  // ❌ undefined，没有暴露`;

  const encapsulationPair = codeBlocksRow([
    codeBlock('Java：private + public 方法', 'dot-blue', 'java', encapsulationCode),
    codeBlock('前端：闭包模拟私有', 'dot-orange', 'javascript', encapsulationJs),
  ]);

  const inheritanceCode = `// 继承：子类获得父类所有非 private 成员，并可扩展/重写
public class Animal {
    protected String name;                      // protected：子类可见
    public Animal(String name) { this.name = name; }
    public String speak() { return name + " makes a sound"; }
}

public class Dog extends Animal {               // extends：单继承
    public Dog(String name) { super(name); }    // super 调用父类构造
    @Override
    public String speak() { return name + " 汪汪"; }   // 重写
}

// Java 单继承：一个类只能 extends 一个父类
// 想要"多继承"用 implements 实现多个接口`;

  const inheritanceJs = `// 前端：组合 / mixin / extends（class 语法）
class Animal {
  constructor(name) { this.name = name; }
  speak() { return \`\${this.name} makes a sound\`; }
}

class Dog extends Animal {                       // JS 同样用 extends
  constructor(name) { super(name); }
  speak() { return \`\${this.name} 汪汪\`; }
}

// 区别：JS 是原型链继承，没有真正的"类型"概念
//       Java 是基于类的、有严格类型检查的继承`;

  const inheritancePair = codeBlocksRow([
    codeBlock('Java：extends 单继承', 'dot-blue', 'java', inheritanceCode),
    codeBlock('前端：class extends 原型链', 'dot-orange', 'javascript', inheritanceJs),
  ]);

  const polymorphismCode = `// 多态：父类引用指向子类对象，调用的是子类的方法
public Animal pickOne() {
    return Math.random() > 0.5 ? new Dog("旺财") : new Cat("咪咪");
}

Animal a = pickOne();              // 编译期类型是 Animal
System.out.println(a.speak());     // 运行期分派：实际调用 Dog/Cat 的 speak()
// 这就是"动态分派"——JVM 通过虚方法表查找实际要执行的方法`;

  const polymorphismNote = ruleBox('success',
    `<strong>多态三要素：</strong><br>
    ① <strong>继承</strong>：子类继承父类<br>
    ② <strong>重写</strong>：子类覆盖父类方法<br>
    ③ <strong>父类引用指向子类对象</strong>：<code>Animal a = new Dog()</code><br><br>
    <strong>前端类比：</strong>TS 的 <code>interface Animal { speak(): string }</code>，不同实现可互换——
    但 Java 的多态是<strong>运行期</strong>的，TS 的接口约束只在编译期。`);

  // ── 重载 vs 重写 ─────────────────────────────────────────────────────────────

  const overloadOverrideBox = ruleBox('warning',
    `<strong>这是面试高频题，也是 Java 新手最常混淆的两个概念。</strong><br><br>
    <strong>重载（Overload）</strong>：同一个类中，方法名相同、参数列表不同——<strong>编译期</strong>决定调用哪个<br>
    <strong>重写（Override）</strong>：子类覆盖父类方法，方法签名完全相同——<strong>运行期</strong>决定调用哪个`);

  const overloadCode = `// 重载（Overload）：同类中方法名相同，参数不同
public class Calculator {
    public int add(int a, int b) { return a + b; }
    public double add(double a, double b) { return a + b; }
    public int add(int a, int b, int c) { return a + b + c; }
    public String add(String a, String b) { return a + b; }
}

// 编译期根据参数类型决定调用哪个 add
new Calculator().add(1, 2);            // → int add(int,int)
new Calculator().add(1.5, 2.5);        // → double add(double,double)
new Calculator().add(1, 2, 3);         // → int add(int,int,int)
new Calculator().add("a", "b");        // → String add(String,String)

// ⚠️ 返回值不同不算重载！参数列表必须不同（个数 / 类型 / 顺序）
// ⚠️ 参数名不同也不算重载！只看类型`;

  const overrideCode = `// 重写（Override）：子类方法与父类方法签名完全相同
public class Shape {
    public double area() { return 0; }
}

public class Circle extends Shape {
    private double r;
    public Circle(double r) { this.r = r; }

    @Override                                    // 编译器检查：确实覆盖了父类方法
    public double area() { return Math.PI * r * r; }
}

public class Rect extends Shape {
    private double w, h;
    public Rect(double w, double h) { this.w = w; this.h = h; }

    @Override
    public double area() { return w * h; }
}

// 运行期根据实际类型分派
Shape s1 = new Circle(2);
Shape s2 = new Rect(3, 4);
s1.area();   // → 12.566（Circle 的 area）
s2.area();   // → 12.0  （Rect 的 area）`;

  const overloadOverridePair = codeBlocksRow([
    codeBlock('重载 Overload：编译期匹配', 'dot-yellow', 'java', overloadCode),
    codeBlock('重写 Override：运行期分派', 'dot-green', 'java', overrideCode),
  ]);

  const overloadOverrideTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">维度</div>
        <div class="compare-card-header-cell java">重载 Overload</div>
        <div class="compare-card-header-cell desc">重写 Override</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">发生位置</div>
        <div class="compare-card-cell java">同一个类中</div>
        <div class="compare-card-cell desc">子类与父类之间</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">方法名</div>
        <div class="compare-card-cell java">相同</div>
        <div class="compare-card-cell desc">相同</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">参数列表</div>
        <div class="compare-card-cell java">必须不同</div>
        <div class="compare-card-cell desc">必须相同</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">返回值</div>
        <div class="compare-card-cell java">无要求</div>
        <div class="compare-card-cell desc">相同或子类型（协变返回）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">访问修饰符</div>
        <div class="compare-card-cell java">无要求</div>
        <div class="compare-card-cell desc">不能比父类更严格</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">异常</div>
        <div class="compare-card-cell java">无要求</div>
        <div class="compare-card-cell desc">不能抛更宽的检查异常</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">绑定时机</div>
        <div class="compare-card-cell java">静态绑定（编译期）</div>
        <div class="compare-card-cell desc">动态绑定（运行期）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">@Override 注解</div>
        <div class="compare-card-cell java">不能用</div>
        <div class="compare-card-cell desc">建议加，编译器帮检查</div>
      </div>
    </div>`;

  // ── 虚方法表（vtable）────────────────────────────────────────────────────────

  const vtableBox = ruleBox('info',
    `<strong>虚方法表（Virtual Method Table，vtable）是 JVM 实现多态的底层机制。</strong><br><br>
    每个类加载时，JVM 在方法区（元空间）为它构建一张<strong>虚方法表</strong>，
    表中每个槽位对应一个可被重写的方法，存放"<strong>实际要执行的方法字节码地址</strong>"。<br><br>
    调用 <code>obj.speak()</code> 时：JVM 先查 obj 的<strong>实际类型</strong>的 vtable，
    找到 speak 槽位对应的方法地址，再执行——这就是<strong>动态分派</strong>。`);

  const vtableCode = `// 类层次
class Animal { public String speak() { return "..."; } }
class Dog extends Animal { @Override public String speak() { return "汪"; } }
class Cat extends Animal { @Override public String speak() { return "喵"; } }

// JVM 加载时为每个类构建 vtable：
// Animal.vtable[0] = Animal.speak 地址
// Dog.vtable[0]    = Dog.speak 地址      ← 重写了，槽位被覆盖
// Cat.vtable[0]    = Cat.speak 地址      ← 重写了，槽位被覆盖

Animal a = new Dog();
// 字节码：invokevirtual #speak
// JVM 执行时：
//   1. 取 a 的实际类型 → Dog
//   2. 查 Dog.vtable[0] → Dog.speak 地址
//   3. 执行 Dog.speak
a.speak();   // → "汪"`;

  const vtableBlock = codeBlock('vtable 工作原理', 'dot-blue', 'java', vtableCode);

  const nonVirtualTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">修饰符</div>
        <div class="compare-card-header-cell java">是否进 vtable</div>
        <div class="compare-card-header-cell desc">调用指令 / 原因</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">普通 public 方法</div>
        <div class="compare-card-cell java">✅ 进 vtable</div>
        <div class="compare-card-cell desc"><code>invokevirtual</code>，运行期动态分派</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>private</code></div>
        <div class="compare-card-cell java">❌ 不进 vtable</div>
        <div class="compare-card-cell desc"><code>invokespecial</code>，类内可见、不可重写，编译期静态绑定</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>static</code></div>
        <div class="compare-card-cell java">❌ 不进 vtable</div>
        <div class="compare-card-cell desc"><code>invokestatic</code>，属于类、不依赖对象，按引用类型静态绑定</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>final</code></div>
        <div class="compare-card-cell java">❌ 不进 vtable</div>
        <div class="compare-card-cell desc">明确禁止重写，编译器优化为静态绑定（仍用 invokevirtual）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">构造器 <code>&lt;init&gt;</code></div>
        <div class="compare-card-cell java">❌ 不进 vtable</div>
        <div class="compare-card-cell desc"><code>invokespecial</code>，构造器不可被重写</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">接口方法</div>
        <div class="compare-card-cell java">✅ 进 itable</div>
        <div class="compare-card-cell desc"><code>invokeinterface</code>，独立的接口方法表</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>super.method()</code></div>
        <div class="compare-card-cell java">❌ 不查 vtable</div>
        <div class="compare-card-cell desc"><code>invokespecial</code>，编译期确定父类，不动态分派</div>
      </div>
    </div>`;

  const nonVirtualCode = `// 验证 final 不进 vtable：编译期就被"内联"
class Parent {
    public final void cannotOverride() {       // final：禁止重写
        System.out.println("Parent.final");
    }
    public void canOverride() {                // 普通：进 vtable
        System.out.println("Parent.normal");
    }
}

class Child extends Parent {
    @Override
    public void canOverride() {                // 重写，覆盖 vtable 槽位
        System.out.println("Child.normal");
    }
    // public void cannotOverride() {}         // ❌ 编译错误：final 不可重写
}

Parent obj = new Child();
obj.cannotOverride();   // → "Parent.final"（静态绑定，没查 vtable）
obj.canOverride();      // → "Child.normal"（动态绑定，查 Child.vtable）

// ── static 方法：按"引用类型"调用，不看实际对象 ──
class A { public static void hello() { System.out.println("A"); } }
class B extends A { public static void hello() { System.out.println("B"); } }

A a = new B();
a.hello();              // → "A"（不是 "B"！按引用类型 A 调用）
// ⚠️ 实际应该用类名调用：A.hello() / B.hello()，避免误导

// ── private 方法：子类同名只是"隐藏"，不是重写 ──
class Base {
    private void secret() { System.out.println("Base.secret"); }
    public void call() { secret(); }   // 编译期就绑定到 Base.secret
}
class Sub extends Base {
    private void secret() { System.out.println("Sub.secret"); }   // 隐藏，非重写
}
new Sub().call();        // → "Base.secret"（不是 "Sub.secret"！）`;

  const nonVirtualBlock = codeBlock('非虚方法示例：final / static / private', 'dot-yellow', 'java', nonVirtualCode);

  const nonVirtualNote = ruleBox('warning',
    `<strong>关键结论：只有可被重写的实例方法才进 vtable。</strong><br><br>
    <strong>private</strong>：类内可见，子类根本看不到，不可能被重写 → 静态绑定<br>
    <strong>static</strong>：属于类而非对象，调用时只看引用类型 → 静态绑定<br>
    <strong>final</strong>：明确禁止重写，编译器把它当作"不可变"的方法处理 → 静态绑定（JIT 还可能内联）<br><br>
    <strong>实战意义：</strong><br>
    ① 把不需要重写的方法标记为 <code>final</code>，JVM 可跳过 vtable 查找，JIT 更易内联<br>
    ② 调用 <code>static</code> 方法时用类名 <code>ClassName.method()</code>，不要用实例引用，避免误解为多态<br>
    ③ <code>private</code> / <code>final</code> 方法上写 <code>@Override</code> 会编译报错——它们根本不是"重写"`);

  const vtableNote = ruleBox('success',
    `<strong>为什么不是每次都查父类链？</strong> vtable 把"沿着继承链向上找"的过程<strong>提前到类加载阶段</strong>，
    运行时只需一次<strong>数组下标访问</strong>，性能开销极小——和 C++ 的 vtable 思路一致。<br><br>
    <strong>前端类比：</strong>JS 引擎的<strong>隐藏类 + 内联缓存</strong>（V8 的 inline cache）解决的是同样的问题——
    让"动态查找方法"接近"静态调用"的性能。`);

  // ── 内存分配 ─────────────────────────────────────────────────────────────────

  const memoryBox = ruleBox('warning',
    `<strong>理解 Java 内存区域，是看懂 GC、调优、排查 OOM 的前提。</strong><br><br>
    Java 把内存划分为多个区域，每个区域存不同内容、有不同的生命周期。前端只有"堆 + 栈"的概念，
    Java 的划分更细——尤其是<strong>方法区/元空间</strong>存类信息这一点，前端没有对应物。`);

  const memoryTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">区域</div>
        <div class="compare-card-header-cell java">存什么</div>
        <div class="compare-card-header-cell desc">特点 / 前端类比</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">栈（Stack）</div>
        <div class="compare-card-cell java">局部变量、方法参数、引用地址</div>
        <div class="compare-card-cell desc">线程私有，方法结束自动释放 ≈ JS 调用栈</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">堆（Heap）</div>
        <div class="compare-card-cell java">所有 new 出来的对象</div>
        <div class="compare-card-cell desc">线程共享，GC 主战场 ≈ JS 堆（V8 heap）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">元空间（Metaspace）</div>
        <div class="compare-card-cell java">类元信息、常量池、方法字节码</div>
        <div class="compare-card-cell desc">JDK 8+ 替代永久代，使用本地内存</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">程序计数器（PC）</div>
        <div class="compare-card-cell java">当前线程执行的字节码行号</div>
        <div class="compare-card-cell desc">线程私有，前端无对应（JS 单线程）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">本地方法栈</div>
        <div class="compare-card-cell java">native 方法调用</div>
        <div class="compare-card-cell desc">JNI 调用 C/C++ 代码时用</div>
      </div>
    </div>`;

  const memoryCode = `// 示例：看清每个变量 / 对象存在哪
public class Demo {
    static int classVar = 10;            // 类变量：堆（Class 对象）+ 元空间（Class 元信息）
    private String name = "Phil";        // 实例变量：随对象在堆中

    public void run(int param) {         // param 在栈
        int local = 20;                  // 局部变量在栈
        User u = new User("Phil", 30);   // u 引用在栈，User 对象在堆
        String s = "hello";              // "hello" 在堆中的字符串常量池
        System.out.println(local + param);
    }

    public static void main(String[] args) {
        new Demo().run(5);
    }
}

class User {
    String name;     // 实例变量：随对象在堆
    int age;
    User(String n, int a) { this.name = n; this.age = a; }
}

// 内存分配示意：
//   栈（线程私有）        堆（共享）              元空间
//   ─────────────        ─────────────          ───────────
//   main args[]  ──────→ String[] 对象
//   Demo.run
//     param = 5
//     local = 20
//     u        ──────→  User{name="Phil", age=30}
//     s        ──────→  "hello"（字符串常量池）
//
//   静态变量 classVar 存在 Class<Demo> 对象中（堆）`;

  const memoryBlock = codeBlock('Java 内存分配示例', 'dot-orange', 'java', memoryCode);

  const memoryNote = ruleBox('info',
    `<strong>字符串常量池的特殊性：</strong><br>
    <code>String s = "hello"</code>：先查常量池有没有 "hello"，有就直接引用，没有就放入常量池再引用。<br>
    <code>String s = new String("hello")</code>：在堆中创建新对象，常量池的 "hello" 仍存在。<br><br>
    <strong>前端类比：</strong>JS 字符串字面量也有"驻留"机制（V8 的 string table）——原理相同，但 Java 的池行为更明确、可被面试考。`);

  // ── static / final / private 三大修饰符 ─────────────────────────────────────

  const modifierBox = ruleBox('accent',
    `<strong>三大修饰符解决三个不同维度的问题：</strong><br>
    <strong>static</strong>——归属维度：属于类还是属于实例<br>
    <strong>final</strong>——可变维度：能否被重新赋值 / 重写 / 继承<br>
    <strong>private</strong>——可见维度：谁能访问`);

  const modifierTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">修饰符</div>
        <div class="compare-card-header-cell java">作用对象</div>
        <div class="compare-card-header-cell desc">语义 / 前端类比</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>static</code></div>
        <div class="compare-card-cell java">字段 / 方法 / 内部类 / import</div>
        <div class="compare-card-cell desc">类级别，无需 new 对象即可调用 ≈ 模块导出的常量/函数</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>final</code> 字段</div>
        <div class="compare-card-cell java">实例变量 / 静态变量 / 局部变量</div>
        <div class="compare-card-cell desc">只能赋值一次 ≈ <code>const</code></div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>final</code> 方法</div>
        <div class="compare-card-cell java">实例方法 / 静态方法</div>
        <div class="compare-card-cell desc">子类不能重写</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>final</code> 类</div>
        <div class="compare-card-cell java">类</div>
        <div class="compare-card-cell desc">不能被继承（如 String、Integer）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>private</code></div>
        <div class="compare-card-cell java">字段 / 方法 / 构造 / 内部类</div>
        <div class="compare-card-cell desc">仅本类可见 ≈ JS 闭包私有变量</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>protected</code></div>
        <div class="compare-card-cell java">同上</div>
        <div class="compare-card-cell desc">同包 + 子类可见</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>public</code></div>
        <div class="compare-card-cell java">同上</div>
        <div class="compare-card-cell desc">全部可见 ≈ export</div>
      </div>
    </div>`;

  const staticCode = `// static：类级别，所有实例共享一份
public class Counter {
    private static int instanceCount = 0;     // 类变量，所有实例共享
    private int id;

    public Counter() {
        this.id = ++instanceCount;            // 每次创建自增
    }

    public static int getInstanceCount() {    // 类方法，无需 new 即可调用
        return instanceCount;
    }
}

// 调用：
new Counter(); new Counter();
Counter.getInstanceCount();   // → 2，无需通过实例
Counter.instanceCount;        // ❌ 编译错误：private 不可见

// ── 静态导入（Java 5+）──
import static java.lang.Math.PI;
import static java.util.Collections.emptyList;
double r = PI * 2;             // 直接用 PI，不用 Math.PI
List<Object> l = emptyList();  // 直接调用`;

  const finalCode = `// final：只能赋值一次
public class Config {
    public static final int MAX_RETRY = 3;   // 常量：大写下划线，编译期常量
    private final String name;                // 实例 final：必须在声明处 / 构造器 / 实例块中赋值
    private final List<String> tags = new ArrayList<>();   // final 引用，但 List 内容可变

    public Config(String name) {
        this.name = name;                     // 构造器赋值
        // this.name = "x"; // ❌ 第二次赋值编译错误
    }

    public void addTag(String t) {
        tags.add(t);                          // ✅ 引用没变，内容可变
        // tags = new ArrayList<>();  // ❌ 引用不能重新赋值
    }
}

// final 类：不能被继承
public final class ImmutableUser { /* ... */ }
// class SubUser extends ImmutableUser {} // ❌ 编译错误

// final 方法：不能被重写
public class Base {
    public final void dontOverride() { /* ... */ }
}
// class Sub extends Base {
//     public void dontOverride() {} // ❌ 编译错误
// }`;

  const privateCode = `// private + public 模式：受控访问
public class User {
    private String name;                       // 字段私有
    private int age;

    public User(String name, int age) {
        setName(name);
        setAge(age);
    }

    public String getName() { return name; }    // getter
    public void setName(String name) {          // setter：可加校验
        if (name == null || name.isBlank())
            throw new IllegalArgumentException("name 不能为空");
        this.name = name;
    }

    public int getAge() { return age; }
    public void setAge(int age) {
        if (age < 0 || age > 150)
            throw new IllegalArgumentException("age 越界");
        this.age = age;
    }
}

// Lombok 用 @Getter @Setter @Data 自动生成这些样板代码`;

  const modifierBlocks = `
    ${codeBlock('static：类级成员', 'dot-blue', 'java', staticCode)}
    ${codeBlock('final：不可变', 'dot-yellow', 'java', finalCode)}
    ${codeBlock('private：可见性控制', 'dot-green', 'java', privateCode)}`;

  const modifierNote = ruleBox('success',
    `<strong>final 在并发场景的特殊意义：</strong><br>
    在 Java 内存模型（JMM）中，<code>final</code> 字段有<strong>初始化安全性</strong>保证——
    其他线程看到构造完成的对象时，一定能看到 final 字段的正确值，无需额外同步。<br><br>
    <strong>不可变对象天然线程安全</strong>：String、Integer、LocalDate 都是 final 类，多线程下无需加锁。`);

  // ── 枚举（enum）────────────────────────────────────────────────────────────

  const enumBox = ruleBox('info',
    `<strong>Java 枚举不是简单的"常量集合"，本质是继承 <code>java.lang.Enum</code> 的 final 类。</strong><br><br>
    每个枚举常量是<strong>该类的单例实例</strong>——所以枚举天然支持字段、方法、构造器、实现接口，
    是 Java 实现<strong>类型安全单例模式</strong>的最佳方式。`);

  const enumBasicCode = `// 基础枚举
public enum OrderStatus {
    PENDING, PAID, SHIPPED, DELIVERED, REFUNDED
}

// 使用
OrderStatus s = OrderStatus.PAID;
s.name();          // → "PAID"   名字
s.ordinal();       // → 1        序号（从 0 开始，不建议依赖）
OrderStatus.values();                    // 所有枚举值数组
OrderStatus.valueOf("PAID");             // 字符串转枚举（不存在抛异常）

// switch 友好
switch (s) {
    case PENDING  -> System.out.println("待支付");
    case PAID     -> System.out.println("已支付");
    case SHIPPED  -> System.out.println("已发货");
    default       -> System.out.println("其他");
}`;

  const enumAdvancedCode = `// 枚举带字段和方法：本质上是一个 final 类
public enum OrderStatus {
    PENDING(0,   "待支付"),
    PAID(1,      "已支付"),
    SHIPPED(2,   "已发货"),
    DELIVERED(3, "已签收"),
    REFUNDED(4,  "已退款");

    private final int code;            // 枚举字段
    private final String desc;

    OrderStatus(int code, String desc) {  // 构造器：默认 private，不能 new
        this.code = code;
        this.desc = desc;
    }

    public int getCode() { return code; }
    public String getDesc() { return desc; }

    public boolean canRefund() {        // 枚举可以有方法
        return this == PAID || this == SHIPPED;
    }

    public static OrderStatus fromCode(int code) {  // 静态工厂
        for (OrderStatus s : values())
            if (s.code == code) return s;
        throw new IllegalArgumentException("invalid code: " + code);
    }
}

// 使用
OrderStatus.PAID.getCode();          // → 1
OrderStatus.SHIPPED.canRefund();     // → true
OrderStatus.fromCode(3);             // → DELIVERED`;

  const enumPair = codeBlocksRow([
    codeBlock('基础枚举', 'dot-blue', 'java', enumBasicCode),
    codeBlock('带字段/方法/构造的枚举', 'dot-green', 'java', enumAdvancedCode),
  ]);

  const enumSingletonCode = `// 枚举实现单例：Effective Java 推荐的最佳实践
public enum DatabaseConnection {
    INSTANCE;                                   // 唯一实例

    private final Connection conn;

    DatabaseConnection() {                       // 私有构造，JVM 保证只调用一次
        this.conn = createConnection();
    }

    public Connection getConnection() { return conn; }
    public void execute(String sql) { /* ... */ }
}

// 使用
DatabaseConnection.INSTANCE.execute("SELECT 1");

// 为什么枚举单例优于 double-checked locking？
// ① JVM 类加载机制保证线程安全，无需 synchronized
// ② 天然防反射攻击（Constructor#newInstance 对枚举抛异常）
// ③ 天然防反序列化破单例（枚举序列化由 JVM 特殊处理）`;

  const enumSingletonBlock = codeBlock('枚举实现单例（最佳实践）', 'dot-orange', 'java', enumSingletonCode);

  const enumNote = ruleBox('success',
    `<strong>前端类比：</strong>TS 的 <code>enum</code> 或 <code>union type</code> 解决的是同一个问题——
    限定取值范围、避免魔法字符串。但 Java 的 enum 是<strong>真正的类</strong>，可以带状态和行为，
    而 TS 的 enum 编译后只是数字 / 字符串常量。<br><br>
    <strong>实战建议：</strong>任何有限取值集合（订单状态、性别、错误码、支付方式）都应该用 enum，
    不要用 <code>public static final int</code> 或字符串常量——enum 有类型安全、可穷举、可读性高。`);

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('Java 数据类型', dataTypeBox + primitiveTable + primitiveBlock + referenceBlock + boxingBlock + passByValueBlock + passByValueNote)}
    ${section('面向对象三大特性', oopBox + encapsulationPair + inheritancePair + polymorphismCode + polymorphismNote)}
    ${section('重载 vs 重写', overloadOverrideBox + overloadOverridePair + overloadOverrideTable)}
    ${section('虚方法表（vtable）', vtableBox + vtableBlock + nonVirtualTable + nonVirtualBlock + nonVirtualNote + vtableNote)}
    ${section('Java 变量与方法的内存分配', memoryBox + memoryTable + memoryBlock + memoryNote)}
    ${section('static / final / private 三大修饰符', modifierBox + modifierTable + modifierBlocks + modifierNote)}
    ${section('枚举（enum）', enumBox + enumPair + enumSingletonBlock + enumNote)}`);
}
