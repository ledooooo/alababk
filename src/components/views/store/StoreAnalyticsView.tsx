import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Order, Product } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { TrendingUp, ShoppingBag, DollarSign, Award, CheckCircle2 } from 'lucide-react';

export const StoreAnalyticsView: React.FC = () => {
  const currentUser = StorageRepo.getCurrentUser();
  const storeId = currentUser?.associated_store_id || 'store-1';
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (storeId) {
      const storeOrders = StorageRepo.getOrders().filter((o) => o.store_id === storeId);
      setOrders(storeOrders);
      setProducts(StorageRepo.getProducts(storeId));
    }
  }, [storeId]);

  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

  // Aggregate product sales
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  deliveredOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.product_name]) {
        productSalesMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.product_name].qty += item.quantity;
      productSalesMap[item.product_name].revenue += item.total_price;
    });
  });

  const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <span>الإحصائيات والتقارير المالية للمحل</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          تحليل أداء المبيعات، المنتجات الأكثر طلباً، والأرباح
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">إجمالي أرباح المبيعات</span>
          <div className="text-xl font-black text-emerald-700">{formatCurrency(totalRevenue)}</div>
          <p className="text-[11px] text-slate-400">من {deliveredOrders.length} طلبات مكتملة</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">متوسط قيمة الطلب الواحد</span>
          <div className="text-xl font-black text-slate-900">{formatCurrency(avgOrderValue)}</div>
          <p className="text-[11px] text-slate-400">متوسط سلة المشتريات</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">نسبة نجاح واكتمال الطلبات</span>
          <div className="text-xl font-black text-blue-600">
            {orders.length > 0 ? `${Math.round((deliveredOrders.length / orders.length) * 100)}%` : '100%'}
          </div>
          <p className="text-[11px] text-slate-400">نسبة التوصيل الناجح</p>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Award className="w-5 h-5 text-amber-500" />
          <span>المنتجات الأكثر مبيعاً بالمحل</span>
        </h3>

        {topProducts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">لا توجد بيانات مبيعات بعد.</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((tp, idx) => (
              <div key={tp.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-200 text-slate-800 font-black rounded-lg flex items-center justify-center text-xs">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-slate-900">{tp.name}</span>
                </div>

                <div className="text-left font-semibold text-slate-700">
                  <span>تم بيع {tp.qty} قطعة</span>
                  <span className="text-emerald-700 font-bold block">{formatCurrency(tp.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
