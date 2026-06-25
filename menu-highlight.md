# 菜单高亮逻辑说明

## 概述

`layout.js` 实现了三级菜单结构的自动高亮，核心原则是：**用当前页面 URL 的路径部分（去掉 query string）与菜单项 URL 路径做匹配**，命中后逐级向上标记 `active`。

---

## 菜单数据结构

```
MenuList (一级菜单)
  └── ChildMenuList (二级菜单)
        └── ChildMenuList (三级菜单)  ← 实际页面链接在这一层
```

| 层级 | 示例 | 高亮字段 |
|------|------|----------|
| 一级 | 营销 / 会员 | `GroupID` 与 URL 参数 `groupID` 匹配 |
| 二级 | 积分兑换 | `active: true` |
| 三级 | 积分兑换记录列表 | `active: true` |

---

## 一级菜单高亮 — `initFirstMenu`

**触发时机**：菜单 HTML 渲染完成后执行。

**逻辑**：取 URL 中的 `groupID` 参数，与每个一级菜单的 `GroupID` 字段比较，命中的那一项对应的二三级菜单面板会展示出来。

```
URL: .../BonusExchange/BonusExchangeRecordDetail?mallID=10018&groupId=5
                                                                  ↑
groupID=5  →  匹配 MenuList[i].GroupID == "5"  →  展示该一级菜单下的子菜单
```

> 注意：`groupID` 不是集团 ID，仅用于定位一级菜单高亮。

---

## 二三级菜单高亮 — `initSecAndThirdMenu`

**触发时机**：菜单数据处理阶段，渲染模板前执行，直接在数据上标记 `active`。

### 第一步：处理当前页面 URL

```js
var pageUrl = location.href.split('?')[0].split('//')[1];
// 去掉 query string，去掉协议
// https://crm-user-mp-t.chinacdc.com/BonusExchange/BonusExchangeRecordDetail?mallID=10018
// → "crm-user-mp-t.chinacdc.com/BonusExchange/BonusExchangeRecordDetail"

// 若路径末尾是纯数字（如详情页 ID），则去掉
// /Order/Detail/12345 → /Order/Detail
if (/^\d+$/.test(lastvalue)) {
  pageUrl = arr.slice(0, -1).join('/');
}
```

### 第二步：遍历三级菜单逐一比较

```js
$.each(menus, function(i, 一级) {
  $.each(一级.ChildMenuList, function(ii, 二级) {
    $.each(二级.ChildMenuList, function(iii, 三级) {
      var oooUrl = 三级.Url.split('?')[0].split('//')[1]; // 同样处理菜单 URL
      if (oooUrl.toLocaleLowerCase() == pageUrl.toLocaleLowerCase()) {
        二级.active = true; // 二级菜单展开高亮
        三级.active = true; // 三级菜单项高亮
        return false;       // 找到后跳出
      }
    });
  });
});
```

### 第三步：模板渲染时应用 active

```html
<!-- 二级菜单：active 时加 initcur 类，使其默认展开 -->
<li class="{{=secitem.active ? 'initcur' : ''}}">

<!-- 三级菜单：active 时加 cur 类，高亮显示 -->
<dd class="{{=thirditem.active ? 'cur' : ''}}">
```

---

## 特殊场景：channel 参数匹配

当 URL 中存在 `isSpecChannel=1` 时，改用 `channel` 参数匹配，而不是路径匹配：

```js
if (isSpecChannel) {
  var pageChannel = GetParam("channel");
  // 遍历三级菜单，找 channel 值相同的项
  if (ooo.IsDisPlay && oooChannel == pageChannel) {
    二级.active = true;
    三级.active = true;
  }
}
```

---

## 隐藏三级菜单的降级处理

若命中的三级菜单项 `IsDisPlay = false`（被隐藏），则向前查找最近一个可见项来高亮：

```js
if (ooo.IsDisPlay) {
  ooo.active = true;
} else {
  // 向前遍历，找第一个可见的三级菜单项
  for (var t = iii; t--; t >= 0) {
    if (oomenus[t].IsDisPlay) {
      oomenus[t].active = true;
      break;
    }
  }
}
```

---

## 完整匹配流程图

```
页面加载
  │
  ├─ initSecAndThirdMenu(MenuList)        ← 数据层打标
  │     │
  │     ├─ 取 location.href 路径
  │     ├─ 去掉末尾纯数字 ID
  │     └─ 遍历三级菜单，路径匹配命中
  │           → 二级.active = true
  │           → 三级.active = true
  │
  ├─ sideBarTpl 渲染 HTML
  │     ├─ 二级 active → class="initcur"（默认展开）
  │     └─ 三级 active → class="cur"（高亮）
  │
  └─ initFirstMenu(MenuList)             ← DOM 层定位面板
        ├─ 取 URL 参数 groupID
        └─ 找到匹配的一级菜单
              → 显示对应的 .sidelistall 面板
```

---

## 典型案例

**场景**：从积分兑换记录详情页进入，期望"积分兑换记录列表"在菜单中高亮。

| | URL |
|---|---|
| 当前详情页 | `crm-user-mp-t.../BonusExchange/BonusExchangeRecordDetail` |
| 菜单列表项 | `crm-user-mp-t.../BonusExchange/BonusExchangeRecordList` |

两者路径不同，**路径匹配不会命中**。实际能高亮的前提是：

1. 详情页本身在菜单数据里存在对应三级项（路径完全一致），或
2. 详情页通过 `groupID` 参数正确定位了一级菜单面板，视觉上看起来高亮了二级分组。

若需要详情页也能让列表菜单高亮，需在详情页业务代码里手动干预（如页面加载时修改对应菜单项的 DOM class），`layout.js` 本身不处理这种跨路径映射。

---

## 关键函数索引

| 函数 | 行号 | 职责 |
|------|------|------|
| `initSecAndThirdMenu` | 478 | 数据层：遍历三级菜单，路径匹配后打 `active` 标记 |
| `initFirstMenu` | 530 | DOM 层：通过 `groupID` 参数显示对应一级菜单面板 |
| `menuHandle` | 358 | 总调度：数据处理 → 渲染模板 → 初始化高亮 |
| `GetParam` | 164 | 从 URL query string 取参数值 |
