function renderPythonCrawler(t) {
  const intro = ruleBox('accent',
    `Python 爬虫是指用 Python 程序自动抓取网页数据的技术。核心流程：<strong>发请求 → 解析 HTML → 提取数据 → 存储</strong>。常见库组合：<code>requests + BeautifulSoup</code>（静态页）、<code>Playwright/Selenium</code>（动态渲染页）、<code>Scrapy</code>（大规模爬取框架）。`);

  const libRows = [
    ['requests',      'axios / fetch',        '发 HTTP 请求，支持 Session、Cookie、代理'],
    ['httpx',         'ky / got',             '现代化 HTTP 客户端，支持异步（async/await）'],
    ['BeautifulSoup', 'cheerio',              'HTML/XML 解析，CSS 选择器 + Tag 遍历'],
    ['lxml',          'cheerio（xpath 不支持）', '高性能 HTML/XML 解析，支持 XPath'],
    ['Playwright',    'Playwright（官方也有 Node）', '自动化浏览器，处理 JS 渲染页面'],
    ['Selenium',      'Selenium（多语言）',    '老牌浏览器自动化，兼容性好'],
    ['Scrapy',        '无直接对应',            '完整爬虫框架：中间件、管道、调度器'],
    ['Parsel',        'cheerio',              'Scrapy 内置解析器，独立可用，支持 CSS + XPath'],
  ];

  const libTable = compareCard(libRows, ['Python 库', '前端/Node 对应']);

  const staticCode = `import requests
from bs4 import BeautifulSoup

# 发请求（附带 User-Agent 防止被 403）
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
resp = requests.get('https://example.com/list', headers=headers)
resp.raise_for_status()  # 非 2xx 自动抛异常

# 解析 HTML
soup = BeautifulSoup(resp.text, 'lxml')

# CSS 选择器提取
items = soup.select('.article-item')
for item in items:
    title = item.select_one('h2.title').get_text(strip=True)
    link  = item.select_one('a')['href']
    print(title, link)`;

  const asyncCode = `import asyncio
import httpx
from bs4 import BeautifulSoup

async def fetch(client, url):
    resp = await client.get(url)
    soup = BeautifulSoup(resp.text, 'lxml')
    return soup.select_one('h1').get_text(strip=True)

async def main():
    urls = [f'https://example.com/page/{i}' for i in range(1, 11)]
    async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}) as client:
        # 并发抓取 10 个页面
        results = await asyncio.gather(*[fetch(client, u) for u in urls])
    print(results)

asyncio.run(main())`;

  const playwrightCode = `from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto('https://example.com')

    # 等待动态内容加载
    page.wait_for_selector('.dynamic-list')

    # 模拟滚动加载更多
    page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
    page.wait_for_timeout(1000)

    items = page.query_selector_all('.item')
    for item in items:
        print(item.inner_text())

    browser.close()`;

  const scrapyCode = `# myspider/spiders/example.py
import scrapy

class ExampleSpider(scrapy.Spider):
    name = 'example'
    start_urls = ['https://example.com/list']

    def parse(self, response):
        for item in response.css('.article-item'):
            yield {
                'title': item.css('h2.title::text').get().strip(),
                'link':  item.css('a::attr(href)').get(),
            }
        # 翻页
        next_page = response.css('a.next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)

# 运行: scrapy crawl example -o output.json`;

  const antiCrawlHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead>
        <tr style="background:var(--bg-overlay);color:var(--text-secondary)">
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)">反爬手段</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)">应对方案</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">UA 检测</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">伪造 <code>User-Agent</code>（浏览器真实 UA）</td>
        </tr>
        <tr style="background:var(--bg-overlay)">
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">频率限制 / IP 封禁</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">添加随机延迟 <code>time.sleep(random.uniform(1,3))</code>、轮换代理 IP</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">Cookie / Session 校验</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">用 <code>requests.Session()</code> 持久化 Cookie</td>
        </tr>
        <tr style="background:var(--bg-overlay)">
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">JS 动态渲染（SPA）</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">换用 Playwright / Selenium；或找接口直接请求 API</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">验证码（图形 / 滑块）</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">打码平台（2captcha）、ddddocr 图像识别</td>
        </tr>
        <tr style="background:var(--bg-overlay)">
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">Referer / Origin 校验</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)">在请求头中补充 <code>Referer</code></td>
        </tr>
      </tbody>
    </table>`;

  const storageCode = `import csv, json
from pathlib import Path

data = [{'title': 'A', 'price': 99}, {'title': 'B', 'price': 199}]

# 写 JSON
Path('output.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))

# 写 CSV
with open('output.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['title', 'price'])
    writer.writeheader()
    writer.writerows(data)

# 写 SQLite（内置，无需安装）
import sqlite3
conn = sqlite3.connect('data.db')
conn.execute('CREATE TABLE IF NOT EXISTS items (title TEXT, price INTEGER)')
conn.executemany('INSERT INTO items VALUES (?,?)', [(d['title'], d['price']) for d in data])
conn.commit()`;

  const legalNote = ruleBox('warning',
    `<strong>⚠️ 合法合规提示</strong>：爬虫前请先阅读目标网站的 <code>robots.txt</code>（如 <code>https://example.com/robots.txt</code>）和服务条款。禁止爬取涉及个人隐私的数据；避免高频请求影响服务器正常运行；严禁将爬取数据用于商业侵权。`);

  const xpathHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">CSS 选择器（BeautifulSoup）</div>
        <pre style="margin:0;font-size:12px;background:var(--bg-overlay);padding:12px;border-radius:6px;overflow:auto"><code>soup.select('div.list > a')
soup.select_one('#main h2')
el['href']            # 属性
el.get_text(strip=True)  # 文本</code></pre>
      </div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">XPath（lxml / Parsel）</div>
        <pre style="margin:0;font-size:12px;background:var(--bg-overlay);padding:12px;border-radius:6px;overflow:auto"><code>tree.xpath('//div[@class="list"]/a')
tree.xpath('//h2/text()')
tree.xpath('//a/@href')
# Parsel (Scrapy 同款)
sel.css('h2::text').get()</code></pre>
      </div>
    </div>`;

  // ── 包详解 ──────────────────────────────────────────────────────────────────

  const playwrightDetailRows = [
    ['安装', 'uv add playwright && playwright install chromium', '首次需下载浏览器二进制'],
    ['同步 API', 'from playwright.sync_api import sync_playwright', '适合脚本、简单爬虫'],
    ['异步 API', 'from playwright.async_api import async_playwright', '适合高并发、配合 asyncio'],
    ['等待策略', 'page.wait_for_selector() / wait_for_load_state()', '避免内容未渲染就提取'],
    ['网络拦截', 'page.route("**/*.png", lambda r: r.abort())', '屏蔽图片/广告，加速加载'],
    ['截图/PDF', 'page.screenshot() / page.pdf()', '整页截图或生成 PDF'],
    ['多浏览器', 'p.chromium / p.firefox / p.webkit', '支持三大引擎'],
  ];

  const playwrightAsyncCode = `import asyncio
from playwright.async_api import async_playwright

async def crawl(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        )
        page = await ctx.new_page()

        # 屏蔽图片加速加载
        await page.route('**/*.{png,jpg,gif,webp}', lambda r: r.abort())

        await page.goto(url, wait_until='networkidle')
        await page.wait_for_selector('.content')

        text = await page.inner_text('.content')
        await browser.close()
        return text

async def main():
    urls = ['https://example.com/page/1', 'https://example.com/page/2']
    results = await asyncio.gather(*[crawl(u) for u in urls])
    print(results)

asyncio.run(main())`;

  const playwrightDetailSection = section('Playwright 详解', `
    ${compareCard(playwrightDetailRows, ['特性', '用法', '说明'])}
    ${codeBlock('playwright_async.py', 'dot-orange', 'python', playwrightAsyncCode)}`);

  // ── Celery ──────────────────────────────────────────────────────────────────

  const celeryIntro = ruleBox('info',
    `<strong>Celery</strong> 是 Python 生产级异步任务队列。爬虫场景中用于：<strong>分布式调度</strong>（把大量 URL 分发给多个 Worker 并发抓取）、<strong>定时任务</strong>（每日定时重新爬取）、<strong>失败重试</strong>（网络超时自动重入队列）。核心组件：<strong>Producer</strong>（生产任务）→ <strong>Broker</strong>（Redis/RabbitMQ 中间件）→ <strong>Worker</strong>（消费执行）→ <strong>Backend</strong>（存储结果）。`);

  const celeryRows = [
    ['celery',          'uv add celery',              '核心包'],
    ['redis（Broker）', 'uv add redis',               '最常用 Broker，也可用 RabbitMQ'],
    ['flower',          'uv add flower',              '实时监控 Worker 状态的 Web UI'],
    ['celery-beat',     '内置，需配置 beat_schedule',       '定时任务调度器'],
    ['kombu',           '随 celery 自动安装',               '消息抽象层，支持多种 Broker'],
  ];

  const celeryInstallCode = `uv add celery redis flower

# 项目结构
# myproject/
#   tasks.py      ← 定义 Celery 任务
#   celery_app.py ← Celery 实例配置
#   run.py        ← 生产任务（Producer）`;

  const celeryConfigCode = `# celery_app.py
from celery import Celery

app = Celery(
    'crawler',
    broker='redis://localhost:6379/0',   # 任务队列
    backend='redis://localhost:6379/1',  # 结果存储
)

app.conf.update(
    task_serializer='json',
    result_expires=3600,         # 结果 1 小时过期
    worker_concurrency=8,        # 每个 Worker 并发数
    task_acks_late=True,         # 任务执行完再 ACK，防丢失
    task_reject_on_worker_lost=True,
)`;

  const celeryTaskCode = `# tasks.py
import requests
from bs4 import BeautifulSoup
from celery_app import app

@app.task(bind=True, max_retries=3, default_retry_delay=5)
def crawl_page(self, url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')
        title = soup.select_one('h1').get_text(strip=True)
        return {'url': url, 'title': title}
    except Exception as exc:
        # 失败自动重试，最多 3 次
        raise self.retry(exc=exc)

# run.py（生产任务）
from tasks import crawl_page

urls = [f'https://example.com/article/{i}' for i in range(1, 101)]
jobs = [crawl_page.delay(url) for url in urls]  # 全部入队

# 等待所有结果
results = [job.get(timeout=30) for job in jobs]
print(results)`;

  const celeryStartCode = `# 启动 Redis（如未运行）
redis-server

# 启动 Worker（-c 并发数，-l 日志级别）
celery -A celery_app worker -c 8 -l info

# 启动定时调度器（搭配 beat_schedule 使用）
celery -A celery_app beat -l info

# 启动 Flower 监控面板（访问 http://localhost:5555）
celery -A celery_app flower`;

  const celerySection = section('Celery Worker：分布式爬虫调度', `
    ${celeryIntro}
    ${compareCard(celeryRows, ['组件', '安装', '说明'])}
    ${codeBlocksRow([
      codeBlock('celery_app.py', 'dot-red', 'python', celeryConfigCode),
      codeBlock('tasks.py', 'dot-purple', 'python', celeryTaskCode),
    ])}
    ${codeBlock('启动命令', 'dot-green', 'bash', celeryStartCode)}`);

  // ── 其他常用包 ────────────────────────────────────────────────────────────────

  const otherPackagesRows = [
    ['fake-useragent',  'uv add fake-useragent',   '随机生成真实 UA，防 UA 检测', 'requests.get(url, headers={"User-Agent": ua.random})'],
    ['httpx',           'uv add httpx',            '支持 HTTP/2、async，可替代 requests', 'async with httpx.AsyncClient() as c: r = await c.get(url)'],
    ['aiohttp',         'uv add aiohttp',          '纯异步 HTTP，高并发场景', 'async with aiohttp.ClientSession() as s: r = await s.get(url)'],
    ['redis-py',        'uv add redis',            '爬虫去重（布隆过滤器）、URL 队列', 'r.sadd("visited", url)  # URL 去重集合'],
    ['pymongo',         'uv add pymongo',          '存储半结构化爬取数据', 'db.items.insert_many(data)'],
    ['sqlalchemy',      'uv add sqlalchemy',       '关系型数据库 ORM，存结构化数据', 'session.bulk_insert_mappings(Item, rows)'],
    ['ddddocr',         'uv add ddddocr',          '验证码图像识别（图形验证码）', 'result = ocr.classification(img_bytes)'],
    ['loguru',          'uv add loguru',           '结构化日志，替代 logging', 'logger.info("crawled {url}", url=url)'],
    ['tenacity',        'uv add tenacity',         '请求重试装饰器（指数退避）', '@retry(stop=stop_after_attempt(3), wait=wait_exponential())'],
    ['stem',            'uv add stem',             '控制 Tor 网络轮换出口 IP', '配合 requests + socks5 代理使用'],
    ['apscheduler',     'uv add apscheduler',      '轻量定时调度（不需要 Celery 时）', 'scheduler.add_job(crawl, "cron", hour=2)'],
  ];

  const otherPackagesHtml = `
    <div style="overflow:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:600px">
      <thead>
        <tr style="background:var(--bg-overlay);color:var(--text-secondary)">
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap">包名</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap">安装</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)">用途</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)">典型用法</th>
        </tr>
      </thead>
      <tbody>
        ${otherPackagesRows.map(([name, install, desc, example], i) => `
        <tr${i % 2 === 1 ? ' style="background:var(--bg-overlay)"' : ''}>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)"><code style="font-family:var(--font-code);font-size:12px;color:var(--accent-light)">${escHtml(name)}</code></td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap"><code style="font-family:var(--font-code);font-size:11px;color:var(--text-secondary)">${escHtml(install)}</code></td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-secondary)">${escHtml(desc)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid var(--border)"><code style="font-family:var(--font-code);font-size:11px;color:var(--blue)">${escHtml(example)}</code></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>`;

  const dedupeCode = `import redis

r = redis.Redis(host='localhost', port=6379, db=2)

def is_visited(url: str) -> bool:
    """布隆过滤器替代方案：用 Set 去重（内存换速度）"""
    return r.sismember('visited_urls', url)

def mark_visited(url: str):
    r.sadd('visited_urls', url)

# 使用
if not is_visited(url):
    crawl(url)
    mark_visited(url)`;

  const otherSection = section('其他常用包速查', `
    ${otherPackagesHtml}
    ${codeBlock('redis_dedup.py（URL 去重示例）', 'dot-red', 'python', dedupeCode)}`);

  // ── 选型建议 ────────────────────────────────────────────────────────────────

  const stackRows = [
    ['小脚本 / 一次性抓取', 'requests + BeautifulSoup / lxml', '简单直接，几十行搞定'],
    ['高并发静态页',         'httpx / aiohttp + asyncio',       '同时发数百请求，IO 密集型首选'],
    ['JS 渲染 / SPA',        'Playwright（async）',             '真实浏览器执行 JS，处理登录、滑块'],
    ['大规模定时爬取',        'Scrapy + Celery + Redis',         'Scrapy 负责解析，Celery 调度分发，Redis 去重 + 队列'],
    ['企业级分布式',          'Scrapy-Redis + Celery + Flower',  '多机 Worker，Flower 监控，Redis 共享 URL 队列'],
  ];

  const stackSection = section('技术栈选型建议', compareCard(stackRows, ['场景', '推荐技术栈', '说明']));

  return articleShell(t, `
    ${section('什么是 Python 爬虫', intro)}
    ${section('⚠️ 合法合规', legalNote)}
    ${section('常用库对照（Python vs 前端）', libTable)}
    ${section('静态页面爬取（requests + BeautifulSoup）', codeBlock('static_crawler.py', 'dot-green', 'python', staticCode))}
    ${section('异步并发爬取（httpx + asyncio）', codeBlock('async_crawler.py', 'dot-blue', 'python', asyncCode))}
    ${section('动态渲染页面（Playwright）', codeBlock('playwright_crawler.py', 'dot-orange', 'python', playwrightCode))}
    ${playwrightDetailSection}
    ${celerySection}
    ${section('大规模爬取框架（Scrapy）', codeBlock('example_spider.py', 'dot-purple', 'python', scrapyCode))}
    ${otherSection}
    ${stackSection}
    ${section('CSS 选择器 vs XPath 速查', xpathHtml)}
    ${section('反爬应对策略', antiCrawlHtml)}
    ${section('数据存储（JSON / CSV / SQLite）', codeBlock('storage.py', 'dot-green', 'python', storageCode))}`);
}
