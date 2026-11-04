"""Run one persistent worker, with a private durable SQLite volume."""
import argparse
import logging
import os
from pathlib import Path
import time
from core import Store, deliver


def paid_orders(account):
    cursor = None
    seen = set()
    while True:
        cursor, orders = account.get_sells(start_from=cursor, include_paid=True,
                                         include_closed=False, include_refunded=False)
        for order in orders:
            yield order
        if not cursor:
            break
        if cursor in seen:
            raise RuntimeError('Repeated pagination cursor')
        seen.add(cursor)
        time.sleep(2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--initialize', action='store_true', help='Skip already existing orders on first connection')
    parser.add_argument('--import-plan', choices=['monthly','quarterly','lifetime'])
    parser.add_argument('--keys-file')
    args = parser.parse_args()
    os.umask(0o077)
    path = Path(os.environ.get('FUNPAY_STATE', 'data/delivery.sqlite3'))
    path.parent.mkdir(parents=True, exist_ok=True)
    store = Store(path)
    if args.import_plan:
        if not args.keys_file:
            parser.error('--keys-file is required')
        store.import_keys(args.import_plan, Path(args.keys_file).read_text(encoding='utf-8-sig').splitlines())
        print('Keys imported. Keep the database private and backed up.')
        return
    if not os.environ.get('FUNPAY_GOLDEN_KEY') or not os.environ.get('FUNPAY_USER_AGENT'):
        parser.error('Configure FUNPAY_GOLDEN_KEY and FUNPAY_USER_AGENT as private server secrets')
    from FunPayAPI import Account, enums
    # Never log library HTTP requests, cookies, message bodies or exception strings.
    logging.getLogger('FunPayAPI').setLevel(logging.CRITICAL)
    account = Account(os.environ['FUNPAY_GOLDEN_KEY'], user_agent=os.environ['FUNPAY_USER_AGENT'], requests_timeout=20).get()
    if args.initialize:
        if store.initialized():
            parser.error('Already initialized; preserve the existing database')
        store.initialize([o.id for o in paid_orders(account)])
        print('Baseline saved. Existing orders will not receive duplicate delivery.')
        return
    if not store.initialized():
        parser.error('Run --initialize once before accepting new automated orders')
    refreshed = time.monotonic()
    while True:
        try:
            if time.monotonic()-refreshed > 2400:
                account.get(update_phpsessid=True)
                refreshed = time.monotonic()
            for order in paid_orders(account):
                try:
                    if getattr(order, 'amount', None) != 1:
                        print('Order requires manual quantity review.', flush=True)
                        continue
                    if deliver(account, store, order.id, enums.OrderStatuses.PAID):
                        print('Delivery accepted by FunPay.', flush=True)
                except Exception as exc:
                    print('Order deferred: '+type(exc).__name__, flush=True)
                time.sleep(2)
        except Exception as exc:
            print('Connection deferred: '+type(exc).__name__, flush=True)
        time.sleep(30)


if __name__ == '__main__':
    main()
