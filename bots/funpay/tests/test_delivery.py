import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import tempfile
import unittest
from types import SimpleNamespace as NS
from core import Store, PLANS, deliver


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=Path.cwd())
        self.store = Store(Path(self.tmp.name)/'state.db')
        self.key = 'RV-'+'A'*48
        self.store.import_keys('monthly', [self.key, 'RV-'+'B'*48])
        self.order = NS(id='ORDER1', status='PAID', seller_id=17, buyer_id=29,
                        buyer_username='buyer', subcategory=NS(id=223), short_description=PLANS['monthly'])
        self.messages = []
        self.account = NS(id=17, get_order=lambda _:self.order,
                          get_chat_by_name=lambda *args:NS(id=41),
                          send_message=lambda chat,text:self.messages.append((chat,text)))

    def tearDown(self):
        self.store.db.close()
        self.tmp.cleanup()

    def test_paid_delivery_once_after_restart(self):
        self.assertTrue(deliver(self.account,self.store,'ORDER1','PAID'))
        self.store.db.close()
        self.store = Store(Path(self.tmp.name)/'state.db')
        self.assertFalse(deliver(self.account,self.store,'ORDER1','PAID'))
        self.assertEqual(len(self.messages),1)
        self.assertIn(self.key,self.messages[0][1])

    def test_ambiguous_send_retries_same_key(self):
        def failed(chat,text):
            self.messages.append((chat,text))
            raise TimeoutError()
        self.account.send_message=failed
        with self.assertRaises(TimeoutError):
            deliver(self.account,self.store,'ORDER1','PAID')
        self.account.send_message=lambda chat,text:self.messages.append((chat,text))
        deliver(self.account,self.store,'ORDER1','PAID')
        self.assertEqual(self.messages[0],self.messages[1])
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM deliveries').fetchone()[0],1)

    def test_refunded_wrong_seller_wrong_product_do_not_deliver(self):
        for field,value in [('status','REFUNDED'),('seller_id',999),('short_description','Other product')]:
            original=getattr(self.order,field)
            setattr(self.order,field,value)
            self.assertFalse(deliver(self.account,self.store,'ORDER1','PAID'))
            setattr(self.order,field,original)
        self.assertEqual(self.messages,[])

    def test_refund_between_checks_does_not_send(self):
        calls=[]
        def fetch(_):
            calls.append(1)
            if len(calls)>1:self.order.status='REFUNDED'
            return self.order
        self.account.get_order=fetch
        self.assertFalse(deliver(self.account,self.store,'ORDER1','PAID'))
        self.assertEqual(self.messages,[])

    def test_baseline_orders_skipped(self):
        self.store.initialize(['ORDER1'])
        self.assertFalse(deliver(self.account,self.store,'ORDER1','PAID'))

    def test_stock_exhaustion_and_identity_mismatch_fail_closed(self):
        self.store.reserve('A',29,'monthly')
        with self.assertRaises(ValueError):self.store.reserve('A',30,'monthly')
        self.store.reserve('B',30,'monthly')
        with self.assertRaises(LookupError):self.store.reserve('C',31,'monthly')

    def test_invalid_import_is_atomic(self):
        with self.assertRaises(ValueError):self.store.import_keys('monthly',['RV-'+'C'*48,'bad'])
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM stock').fetchone()[0],2)
        with self.assertRaises(ValueError):self.store.import_keys('lifetime',[self.key])


if __name__=='__main__':unittest.main()
