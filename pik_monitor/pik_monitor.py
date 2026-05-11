import re
import json
import time
import statistics
import requests
from datetime import datetime
from playwright.sync_api import sync_playwright

BOT_TOKEN = "8516269523:AAFY4M_AKZnHeTmtIudwyRIeIAQhyffZ1J4"
CHAT_ID = "1598087325"

CHECK_EVERY_SECONDS = 600
MIN_DISCOUNT = 12
SEEN_FILE = "pik_seen.json"

URLS = [
    ("кладовая", "https://www.pik.ru/search/storehouse"),
    ("машиноместо", "https://www.pik.ru/search/parking"),
]

def tg_send(text, url=None):
    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    if url:
        payload["reply_markup"] = json.dumps({
            "inline_keyboard": [[{"text": "Открыть в PIK", "url": url}]]
        })
    requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        data=payload,
        timeout=25,
    )

def load_seen():
    try:
        with open(SEEN_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_seen(data):
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def money(x):
    return f"{int(x):,}".replace(",", " ")

def collect_page(page, lot_type, url):
    print("Открываю:", url)
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    time.sleep(10)

    for _ in range(20):
        page.mouse.wheel(0, 4000)
        time.sleep(1)

    text = page.locator("body").inner_text(timeout=30000)
    print("TEXT length:", len(text))

    with open(f"debug_{lot_type}.txt", "w", encoding="utf-8") as f:
        f.write(text)

    lots = []

    if lot_type == "кладовая":
        pattern = r"Кладовая,\s*([\d.,]+)\s*м².*?Стоимость\s*([\d\s]+)\s*₽.*?Цена за м²\s*([\d\s]+)\s*₽.*?Артикул:\s*(\d+)"
        path = "storehouse"
        cards = re.findall(pattern, text, re.S)
        print("Карточек:", len(cards))

        for area, price, price_m2, article in cards:
            area = float(area.replace(",", "."))
            price = int(price.replace(" ", ""))
            price_m2 = int(price_m2.replace(" ", ""))
            lots.append({
                "id": article,
                "type": lot_type,
                "area": area,
                "price": price,
                "price_m2": price_m2,
                "url": f"https://www.pik.ru/{path}/{article}",
            })

    else:
        pattern = r"(?:Машино-место|Машиноместо).*?Стоимость\s*([\d\s]+)\s*₽.*?Артикул:\s*(\d+)"
        path = "parking"
        cards = re.findall(pattern, text, re.S)
        print("Карточек:", len(cards))

        for price, article in cards:
            price = int(price.replace(" ", ""))
            lots.append({
                "id": article,
                "type": lot_type,
                "area": 0,
                "price": price,
                "price_m2": price,
                "url": f"https://www.pik.ru/{path}/{article}",
            })

    uniq = {}
    for lot in lots:
        uniq[lot["id"]] = lot

    lots = list(uniq.values())
    print("Найдено:", lot_type, len(lots))
    return lots

def median_price(lots):
    values = [x["price_m2"] for x in lots if x.get("price_m2")]
    if len(values) < 3:
        return None
    return statistics.median(sorted(values))

def detect_deals(lots, seen):
    median = median_price(lots)
    if not median:
        return []

    deals = []

    for lot in lots:
        discount = (1 - lot["price_m2"] / median) * 100

        if discount >= MIN_DISCOUNT:
            old = seen.get(lot["id"])
            is_new = old is None
            price_drop = old and lot["price"] < old.get("price", lot["price"])

            if is_new or price_drop:
                lot["discount"] = round(discount, 1)
                lot["median"] = int(median)
                lot["reason"] = "новый объект" if is_new else "цена снизилась"
                deals.append(lot)

    return deals

def send_deal(lot):
    text = f"""🔥 <b>Выгодный объект PIK</b>

<b>Тип:</b> {lot['type']}
<b>Причина:</b> {lot['reason']}

<b>Площадь:</b> {lot.get('area', '—')} м²
<b>Цена:</b> {money(lot['price'])} ₽
<b>Цена/м²:</b> {money(lot['price_m2'])} ₽

<b>Медиана:</b> {money(lot['median'])} ₽/м²
<b>Скидка:</b> {lot['discount']}%

<b>ID:</b> {lot['id']}
<b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}"""
    tg_send(text, lot["url"])

def run_once():
    seen = load_seen()
    all_lots = []

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir="./pik_profile",
            headless=False,
            viewport={"width": 1400, "height": 900},
            locale="ru-RU",
        )

        page = browser.pages[0]

        for lot_type, url in URLS:
            try:
                all_lots += collect_page(page, lot_type, url)
            except Exception as e:
                print("Ошибка:", lot_type, e)

        browser.close()

    print("Всего объектов:", len(all_lots))

    if not all_lots:
        tg_send("⚠️ PIK monitor: объекты не найдены")
        return

    deals = detect_deals(all_lots, seen)
    print("Выгодных:", len(deals))

    for deal in deals:
        send_deal(deal)

    now = datetime.now().isoformat()

    for lot in all_lots:
        old = seen.get(lot["id"], {})
        seen[lot["id"]] = {
            "price": lot["price"],
            "first_seen": old.get("first_seen", now),
            "updated": now,
        }

    save_seen(seen)

def main():
    if "ВСТАВЬ" in BOT_TOKEN:
        print("Вставь BOT_TOKEN в pik_monitor.py")
        return

    tg_send("✅ PIK monitor на Mac запущен")

    while True:
        run_once()
        print("Ждем 10 минут...")
        time.sleep(CHECK_EVERY_SECONDS)

if __name__ == "__main__":
    main()
