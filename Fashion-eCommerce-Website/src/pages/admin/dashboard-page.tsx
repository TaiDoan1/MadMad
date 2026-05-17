import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Package, ShoppingBag, TrendingUp, Users } from "lucide-react";

import { useOrders } from "@/features/orders/context/order-context";
import { useProducts } from "@/features/products/context/product-context";

export function AdminDashboardPage() {
  const { products } = useProducts();
  const { orders } = useOrders();

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((order) => ({
      id: order.orderNumber,
      customer: order.customerName,
      total: order.total,
      status: order.status,
    }));

  const totalRevenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.total, 0);

  const uniqueCustomers = new Set(orders.map((order) => order.customerPhone || order.customerEmail)).size;

  const salesByMonth = new Map<string, number>();
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  orders
    .filter((order) => order.status !== "cancelled")
    .forEach((order) => {
      const monthLabel = monthFormatter.format(new Date(order.createdAt));
      const current = salesByMonth.get(monthLabel) ?? 0;
      salesByMonth.set(monthLabel, current + order.total);
    });

  const salesData = Array.from(salesByMonth.entries()).map(([month, sales]) => ({ month, sales }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: DollarSign, title: "Total Revenue", value: `${totalRevenue.toLocaleString("vi-VN")}₫`, accent: "bg-blue-100 text-blue-600" },
          { icon: ShoppingBag, title: "Total Orders", value: orders.length.toLocaleString("vi-VN"), accent: "bg-primary/10 text-primary" },
          { icon: Package, title: "Total Products", value: products.length.toLocaleString("vi-VN"), accent: "bg-green-100 text-green-600" },
          { icon: Users, title: "Total Customers", value: uniqueCustomers.toLocaleString("vi-VN"), accent: "bg-purple-100 text-purple-600" },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border border-border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className={`rounded-lg p-3 ${card.accent}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <span className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="h-4 w-4" />
                +12.5%
              </span>
            </div>
            <h3 className="mb-1 text-2xl">{card.value}</h3>
            <p className="text-sm text-muted-foreground">{card.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-6">
          <h3 className="mb-6">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value: number) => `${(value / 1000000).toFixed(1)}M₫`} />
              <Line type="monotone" dataKey="sales" stroke="#C62828" strokeWidth={2} dot={{ fill: "#C62828", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-border bg-white p-6">
          <h3 className="mb-6">Monthly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value: number) => `${(value / 1000000).toFixed(1)}M₫`} />
              <Bar dataKey="sales" fill="#C62828" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border p-6">
          <h3>Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4">{order.id}</td>
                  <td className="px-6 py-4">{order.customer}</td>
                  <td className="px-6 py-4">{order.total.toLocaleString("vi-VN")}₫</td>
                  <td className="px-6 py-4 uppercase">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
