function renderRtk(t) {
  const installCode = `# 安装 RTK
cargo install rtk
# 验证安装
rtk --version
rtk gain          # 查看 token 节省统计`;

  const usageTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">命令类型</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">示例</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">节省率</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['测试', 'rtk vitest / rtk jest / rtk pytest', '90–99%'],
          ['构建', 'rtk next build / rtk tsc / rtk lint', '70–87%'],
          ['Git', 'rtk git status / rtk git diff / rtk git log', '59–80%'],
          ['包管理', 'rtk pnpm install / rtk npm run', '70–90%'],
          ['GitHub', 'rtk gh pr view / rtk gh run list', '26–87%'],
          ['文件检索', 'rtk ls / rtk grep / rtk find', '60–75%'],
          ['基础设施', 'rtk docker ps / rtk kubectl get', '85%'],
        ].map(([type, cmd, saving]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;color:var(--text-secondary)">${type}</td>
            <td style="padding:8px 10px;font-family:var(--font-code);font-size:11.5px;color:var(--accent-light)">${cmd}</td>
            <td style="padding:8px 10px;color:var(--green);font-family:var(--font-code);font-size:12px">${saving}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const chainCode = `# ❌ 错误：链式命令中遗漏 rtk
git add . && git commit -m "msg" && git push

# ✅ 正确：每个命令都加 rtk 前缀
rtk git add . && rtk git commit -m "msg" && rtk git push`;

  const metaCode = `# 查看总节省统计（token 数 + 费用估算）
rtk gain

# 查看历史命令及各自节省量
rtk gain --history

# 分析 Claude Code 历史，找出漏用 RTK 的命令
rtk discover

# 调试：不经过过滤器直接执行
rtk proxy <cmd>`;

  const tips = [
    ruleBox('success', '<strong>透明代理原则：</strong>RTK 对未识别的命令直接透传，不会改变任何行为。<code>rtk</code> 前缀永远安全，所有命令统一加前缀即可，无需逐一判断。'),
    ruleBox('warning', '<strong>命名冲突：</strong>如果 <code>rtk gain</code> 报错，可能安装了 <a href="https://github.com/reachingforthejack/rtk" style="color:var(--yellow)">reachingforthejack/rtk</a>（Rust Type Kit）。运行 <code>which rtk</code> 确认路径，或用 <code>cargo install rtk</code> 重新安装正确版本。'),
    ruleBox('info', '<strong>Hook 自动注入：</strong>通过 Claude Code Hook 配置后，所有 Bash 命令会自动被 RTK 代理，无需在每条命令前手动加前缀。'),
  ];

  return articleShell(t, `
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('安装', codeBlock('安装 RTK', 'dot-green', 'bash', installCode))}
    ${section('各类命令节省率速查', usageTable)}
    ${section('链式命令注意事项', codeBlock('链式命令写法', 'dot-red', 'bash', chainCode))}
    ${section('Meta 命令', codeBlock('统计与调试', 'dot-yellow', 'bash', metaCode))}
    ${section('注意事项', tips.join(''))}`);
}
