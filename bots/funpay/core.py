"""Durable, single-worker delivery. Never infer payment from chat messages."""
import re
import sqlite3

PLANS = {
    'monthly': 'RIMVISUALS • Визуальный мод Minecraft 1.21.11 Fabric • 30 дней',
    'quarterly': 'RIMVISUALS • Визуальный мод Minecraft 1.21.11 Fabric • 90 дней',
    'lifetime': 'RIMVISUALS • Визуальный мод Minecraft 1.21.11 Fabric • Бессрочный доступ',
}


def normalize(text):
    return ' '.join(str(text or '').split()).casefold()


def plan_for(order, seller_id, paid_status):
    if order.status != paid_status or order.seller_id != seller_id:
        return None
    if getattr(order.subcategory, 'id', None) != 223:
        return None
    return next((p for p, title in PLANS.items()
                 if normalize(order.short_description) == normalize(title)), None)


class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path, timeout=30, isolation_level=None)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS stock(code TEXT PRIMARY KEY, plan TEXT NOT NULL,
                order_id TEXT UNIQUE);
            CREATE TABLE IF NOT EXISTS deliveries(order_id TEXT PRIMARY KEY,
                buyer_id INTEGER NOT NULL, plan TEXT NOT NULL, code TEXT UNIQUE NOT NULL,
                sent INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS settings(name TEXT PRIMARY KEY,value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS baseline(order_id TEXT PRIMARY KEY);
        ''')

    def import_keys(self, plan, codes):
        if plan not in PLANS:
            raise ValueError('Unknown plan')
        codes = [c.strip().upper() for c in codes if c.strip()]
        if any(not re.fullmatch(r'RV-[A-F0-9]{48}', c) for c in codes):
            raise ValueError('Invalid key format; nothing imported')
        self.db.execute('BEGIN IMMEDIATE')
        try:
            for code in codes:
                row = self.db.execute('SELECT plan FROM stock WHERE code=?', (code,)).fetchone()
                if row and row[0] != plan:
                    raise ValueError('Key already belongs to a different plan')
                self.db.execute('INSERT OR IGNORE INTO stock(code,plan) VALUES(?,?)', (code, plan))
            self.db.execute('COMMIT')
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def initialized(self):
        return self.db.execute("SELECT 1 FROM settings WHERE name='initialized'").fetchone() is not None

    def initialize(self, order_ids):
        self.db.execute('BEGIN IMMEDIATE')
        try:
            self.db.executemany('INSERT OR IGNORE INTO baseline VALUES(?)', [(str(x),) for x in order_ids])
            self.db.execute("INSERT INTO settings VALUES('initialized','yes')")
            self.db.execute('COMMIT')
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def reserve(self, order_id, buyer_id, plan):
        order_id = str(order_id)
        self.db.execute('BEGIN IMMEDIATE')
        try:
            if self.db.execute('SELECT 1 FROM baseline WHERE order_id=?', (order_id,)).fetchone():
                result = None
            else:
                row = self.db.execute('SELECT buyer_id,plan,code,sent FROM deliveries WHERE order_id=?', (order_id,)).fetchone()
                if row:
                    if row[:2] != (buyer_id, plan):
                        raise ValueError('Order identity changed')
                    result = None if row[3] else row[2]
                else:
                    key = self.db.execute('SELECT code FROM stock WHERE plan=? AND order_id IS NULL LIMIT 1', (plan,)).fetchone()
                    if not key:
                        raise LookupError('Activation stock is empty')
                    result = key[0]
                    self.db.execute('UPDATE stock SET order_id=? WHERE code=?', (order_id, result))
                    self.db.execute('INSERT INTO deliveries(order_id,buyer_id,plan,code) VALUES(?,?,?,?)', (order_id,buyer_id,plan,result))
            self.db.execute('COMMIT')
            return result
        except Exception:
            self.db.execute('ROLLBACK')
            raise

    def sent(self, order_id):
        self.db.execute('UPDATE deliveries SET sent=1 WHERE order_id=?', (str(order_id),))


def deliver(account, store, order_id, paid_status):
    order = account.get_order(order_id)
    plan = plan_for(order, account.id, paid_status)
    if not plan:
        return False
    chat = account.get_chat_by_name(order.buyer_username, True)
    if not chat:
        raise LookupError('Buyer chat unavailable')
    code = store.reserve(order.id, order.buyer_id, plan)
    if not code:
        return False
    # Re-check immediately before sending, including buyer and product identity.
    latest = account.get_order(order.id)
    if plan_for(latest, account.id, paid_status) != plan or latest.buyer_id != order.buyer_id:
        return False
    message = (f'RIMVISUALS — заказ #{order.id}\nКлюч активации: {code}\n'
               '1. Войдите в свой аккаунт: https://rimvisuals.vercel.app/account.html#purchases\n'
               '2. Вставьте ключ в «Ключ активации из заказа FunPay».\n'
               '3. Нажмите «Активировать ключ», затем «Скачать мод».\n'
               'Ключ одноразовый. Пароль сообщать не нужно. Помощь — в этом чате заказа.')
    account.send_message(chat.id, message)
    store.sent(order.id)
    return True
