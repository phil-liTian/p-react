function renderPythonKeywords(t) {
  const intro = ruleBox('accent',
    `Python 共有 <strong>35 个保留关键字</strong>（Python 3.12），不能用作变量名或函数名。掌握每个关键字的使用场景，是读懂 Python 代码的第一步。`);

  const keywords = [
    // 逻辑与布尔
    { kw: 'True',     group: '字面量',   desc: '布尔真值，等价于整数 1',                       ex: 'is_admin = True' },
    { kw: 'False',    group: '字面量',   desc: '布尔假值，等价于整数 0',                       ex: 'is_guest = False' },
    { kw: 'None',     group: '字面量',   desc: '空值，类似 JS 的 null',                       ex: 'result = None' },
    { kw: 'and',      group: '逻辑运算', desc: '逻辑与，短路求值，返回第一个假值或最后一个值',    ex: 'x > 0 and x < 10' },
    { kw: 'or',       group: '逻辑运算', desc: '逻辑或，短路求值，返回第一个真值或最后一个值',    ex: 'x == 0 or x > 100' },
    { kw: 'not',      group: '逻辑运算', desc: '逻辑非，取反',                                 ex: 'not is_empty' },
    { kw: 'in',       group: '成员运算', desc: '测试成员关系（列表、字典、字符串等）',            ex: '"key" in my_dict' },
    { kw: 'not in',   group: '成员运算', desc: '测试不在集合中',                               ex: 'x not in banned_list' },
    { kw: 'is',       group: '身份运算', desc: '测试是否同一对象（对比 == 测值相等）',           ex: 'obj is None' },
    { kw: 'is not',   group: '身份运算', desc: '测试不是同一对象',                              ex: 'result is not None' },
    // 控制流
    { kw: 'if',       group: '条件分支', desc: '条件语句的主分支',                              ex: 'if score >= 60:' },
    { kw: 'elif',     group: '条件分支', desc: '等价于 else if，多分支判断',                   ex: 'elif score >= 80:' },
    { kw: 'else',     group: '条件分支', desc: '兜底分支；也可用于 for/while/try',              ex: 'else: print("failed")' },
    { kw: 'for',      group: '循环',     desc: '遍历可迭代对象（列表、range、字典等）',           ex: 'for item in items:' },
    { kw: 'while',    group: '循环',     desc: '条件循环，条件为真时持续执行',                   ex: 'while queue:' },
    { kw: 'break',    group: '循环控制', desc: '立即退出最近的循环',                            ex: 'if found: break' },
    { kw: 'continue', group: '循环控制', desc: '跳过本次循环剩余代码，进入下一轮',               ex: 'if skip: continue' },
    { kw: 'pass',     group: '占位符',   desc: '空语句，保持语法完整，常用于占位或抽象基类',      ex: 'def todo(): pass' },
    // 函数与类
    { kw: 'def',      group: '函数定义', desc: '定义函数',                                    ex: 'def greet(name): ...' },
    { kw: 'return',   group: '函数定义', desc: '从函数返回值；无值时返回 None',                 ex: 'return result' },
    { kw: 'lambda',   group: '函数定义', desc: '定义匿名函数（单表达式），等价于 JS 箭头函数',   ex: 'fn = lambda x: x * 2' },
    { kw: 'yield',    group: '生成器',   desc: '将函数变为生成器，惰性产出值',                  ex: 'yield item' },
    { kw: 'yield from', group: '生成器', desc: '委托子生成器，透传其所有值',                    ex: 'yield from sub_gen()' },
    { kw: 'class',    group: '类定义',   desc: '定义类',                                     ex: 'class User(BaseModel):' },
    { kw: 'del',      group: '删除',     desc: '删除变量引用或列表元素',                        ex: 'del cache[key]' },
    // 异常处理
    { kw: 'try',      group: '异常处理', desc: '异常捕获块的起始',                             ex: 'try: risky()' },
    { kw: 'except',   group: '异常处理', desc: '捕获指定类型的异常',                           ex: 'except ValueError as e:' },
    { kw: 'finally',  group: '异常处理', desc: '无论是否异常都执行（常用于资源清理）',            ex: 'finally: conn.close()' },
    { kw: 'raise',    group: '异常处理', desc: '主动抛出异常',                                 ex: 'raise ValueError("invalid")' },
    { kw: 'assert',   group: '调试',     desc: '断言条件，失败时抛出 AssertionError',           ex: 'assert len(lst) > 0' },
    // 导入
    { kw: 'import',   group: '模块导入', desc: '导入整个模块',                                 ex: 'import os' },
    { kw: 'from',     group: '模块导入', desc: '从模块中导入指定成员',                          ex: 'from pathlib import Path' },
    { kw: 'as',       group: '模块导入', desc: '给导入内容或异常变量起别名',                    ex: 'import numpy as np' },
    // 作用域
    { kw: 'global',   group: '作用域',   desc: '声明在函数内修改全局变量',                      ex: 'global counter' },
    { kw: 'nonlocal', group: '作用域',   desc: '声明在嵌套函数中修改外层变量（非全局）',          ex: 'nonlocal total' },
    // 上下文管理
    { kw: 'with',     group: '上下文管理', desc: '自动管理资源（打开/关闭），等价于 try/finally', ex: 'with open("f.txt") as f:' },
    // 异步
    { kw: 'async',    group: '异步',     desc: '标记协程函数或异步上下文管理器',                 ex: 'async def fetch():' },
    { kw: 'await',    group: '异步',     desc: '挂起协程等待结果，只能在 async 函数内使用',      ex: 'data = await resp.json()' },
  ];

  // 分组
  const groupOrder = ['字面量', '逻辑运算', '成员运算', '身份运算', '条件分支', '循环', '循环控制', '占位符', '函数定义', '生成器', '类定义', '删除', '异常处理', '调试', '模块导入', '作用域', '上下文管理', '异步'];
  const grouped = {};
  groupOrder.forEach(g => { grouped[g] = []; });
  keywords.forEach(k => {
    if (grouped[k.group]) grouped[k.group].push(k);
  });

  const groupColors = {
    '字面量': 'info', '逻辑运算': 'accent', '成员运算': 'accent', '身份运算': 'accent',
    '条件分支': 'warning', '循环': 'warning', '循环控制': 'warning', '占位符': 'muted',
    '函数定义': 'success', '生成器': 'success', '类定义': 'success', '删除': 'error',
    '异常处理': 'error', '调试': 'error',
    '模块导入': 'info', '作用域': 'warning', '上下文管理': 'info', '异步': 'accent',
  };

  const tableHtml = groupOrder.map(groupName => {
    const rows = grouped[groupName];
    if (!rows.length) return '';
    const color = groupColors[groupName] || 'info';
    const rowsHtml = rows.map(k => `
      <div style="display:grid;grid-template-columns:110px 1fr 200px;gap:0;border-bottom:1px solid var(--border)">
        <div style="padding:9px 12px;font-family:monospace;font-size:13px;font-weight:600;color:var(--accent-blue);white-space:nowrap">${escHtml(k.kw)}</div>
        <div style="padding:9px 12px;font-size:12.5px;color:var(--text-secondary);line-height:1.6">${escHtml(k.desc)}</div>
        <div style="padding:9px 12px;font-family:monospace;font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(k.ex)}</div>
      </div>`).join('');
    return `
      <div style="margin-bottom:20px">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;padding:0 2px">
          <span class="tag tag-${escHtml(color)}" style="font-size:11px">${escHtml(groupName)}</span>
        </div>
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <div style="display:grid;grid-template-columns:110px 1fr 200px;background:var(--bg-overlay);border-bottom:1px solid var(--border)">
            <div style="padding:7px 12px;font-size:11.5px;font-weight:600;color:var(--text-muted)">关键字</div>
            <div style="padding:7px 12px;font-size:11.5px;font-weight:600;color:var(--text-muted)">使用场景</div>
            <div style="padding:7px 12px;font-size:11.5px;font-weight:600;color:var(--text-muted)">示例</div>
          </div>
          ${rowsHtml}
        </div>
      </div>`;
  }).join('');

  const tip = ruleBox('info',
    `<strong>与 JavaScript 对比</strong>：Python 没有 <code>var/let/const</code>（直接赋值即声明）；没有 <code>function</code> 关键字（用 <code>def</code>）；没有 <code>null</code>（用 <code>None</code>）；没有 <code>===</code>（用 <code>is</code> 比较同一性，用 <code>==</code> 比较值）；<code>async/await</code> 语义类似，但 Python 的事件循环需要显式启动（<code>asyncio.run()</code>）。`);

  return articleShell(t, `
    ${intro}
    ${tip}
    ${section('全部关键字速查', tableHtml)}
  `);
}
