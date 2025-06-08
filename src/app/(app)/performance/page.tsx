
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { format, subDays, addDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar as CalendarIcon, TrendingUp, Package, CheckCircle, Clock, Percent, ArrowLeft, ArrowRight, PackageX } from 'lucide-react';
import type { DailyPerformanceData } from '@/lib/mockData'; // Import the type
import { generateDailyPerformanceEntry } from '@/lib/mockData'; // Import the generator

const today = new Date();
// Regenerate initialPerformanceData with the new structure
const initialPerformanceData: DailyPerformanceData[] = Array.from({ length: 30 }, (_, i) => generateDailyPerformanceEntry(subDays(today, i))).reverse();

const COLORS_PERFORMANCE = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']; // Added chart-5 for red

export default function PerformancePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  // Use the correctly typed performanceData
  const [performanceData, setPerformanceData] = useState<DailyPerformanceData[]>(initialPerformanceData);

  // Simulate fetching new data if selectedDate changes (example)
  useEffect(() => {
    // In a real app, you might fetch data for the selected month or week here
    // For now, we just use the initial 30-day mock data
  }, [selectedDate]);


  const overallStats = useMemo(() => {
    const total = performanceData.reduce((sum, day) => sum + day.totalPackages, 0);
    const delivered = performanceData.reduce((sum, day) => sum + day.deliveredPackages, 0);
    const totalDeliveryTime = performanceData.reduce((sum, day) => sum + day.avgDeliveryTime * day.deliveredPackages, 0);
    const totalDeliveredForAvgTime = performanceData.reduce((sum, day) => sum + (day.deliveredPackages > 0 ? day.deliveredPackages : 0), 0);
    
    const presentDays = performanceData.filter(d => d.attendance === 'Present').length;
    const onTimeOrLateDays = performanceData.filter(d => d.attendance === 'Present' || d.attendance === 'Late').length;

    return {
      allPackages: total,
      allDelivered: delivered,
      successRate: total > 0 ? (delivered / total) * 100 : 0,
      avgDeliveryTime: totalDeliveredForAvgTime > 0 ? totalDeliveryTime / totalDeliveredForAvgTime : 0,
      attendancePresent: presentDays,
      attendanceRate: performanceData.length > 0 ? (onTimeOrLateDays / performanceData.length) * 100 : 0,
    };
  }, [performanceData]);

  const weeklyChartData = useMemo(() => {
    const last7Days = performanceData.slice(-7); // Ensure we have enough data, or adjust slice
    return last7Days.map(day => ({
      date: format(new Date(day.date), "dd/MM"),
      Terkirim: day.deliveredPackages,
      'Tidak Terkirim/Pending': day.undeliveredOrPendingPackages,
    }));
  }, [performanceData]);

  const selectedDayFullData = useMemo(() => {
    return performanceData.find(d => d.date === (selectedDate ? format(selectedDate, "yyyy-MM-dd") : ''));
  }, [performanceData, selectedDate]);

  const dailyChartData = useMemo(() => {
    if (!selectedDayFullData || selectedDayFullData.totalPackages === 0) return [{ name: 'Kosong', value: 1, percent: 100 }];
    return [
      { name: 'Terkirim', value: selectedDayFullData.deliveredPackages, percent: (selectedDayFullData.deliveredPackages / selectedDayFullData.totalPackages) * 100 },
      { name: 'Tidak Terkirim/Pending', value: selectedDayFullData.undeliveredOrPendingPackages, percent: (selectedDayFullData.undeliveredOrPendingPackages / selectedDayFullData.totalPackages) * 100 },
    ].filter(item => item.value > 0);
  }, [selectedDayFullData]);


  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false); 
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Performa Kurir</CardTitle>
            <CardDescription>Analisis kinerja pengiriman dan absensi Anda.</CardDescription>
          </div>
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={(date) => date > new Date() || date < subDays(new Date(), 60)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Package} title="Total Paket (Periode)" value={overallStats.allPackages.toLocaleString()} />
        <StatCard icon={CheckCircle} title="Paket Terkirim (Periode)" value={overallStats.allDelivered.toLocaleString()} />
        <StatCard icon={Percent} title="Rate Keberhasilan (Periode)" value={`${overallStats.successRate.toFixed(1)}%`} />
        <StatCard icon={Clock} title="Rata-rata Waktu Pengiriman" value={`${overallStats.avgDeliveryTime.toFixed(0)} min`} />
        <StatCard icon={CalendarIcon} title="Hadir Tepat Waktu (Periode)" value={`${overallStats.attendancePresent} hari`} />
         <StatCard icon={TrendingUp} title="Rate Kehadiran (Periode)" value={`${overallStats.attendanceRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Pengiriman Mingguan</CardTitle>
            <CardDescription>Jumlah paket dikirim vs tidak terkirim/pending selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Terkirim" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Tidak Terkirim/Pending" stroke="hsl(var(--chart-5))" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performa Harian ({selectedDate ? format(selectedDate, "dd MMM yyyy") : 'Pilih Tanggal'})</CardTitle>
             <CardDescription>
                Distribusi status pengiriman untuk tanggal yang dipilih.
                {selectedDayFullData && selectedDayFullData.dataFinalizedTimestamp && (
                    <span className="block text-xs text-muted-foreground mt-1">
                        Data difinalisasi pada: {format(new Date(selectedDayFullData.dataFinalizedTimestamp), "HH:mm:ss")}
                    </span>
                )}
             </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDayFullData && dailyChartData[0].name !== 'Kosong' ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dailyChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, value, percent }) => `${name}: ${value} (${(percent).toFixed(0)}%)`}>
                    {dailyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PERFORMANCE[index % COLORS_PERFORMANCE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} (${(props.payload.percent).toFixed(1)}%)`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">Pilih tanggal atau tidak ada data pengiriman untuk tanggal ini.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

