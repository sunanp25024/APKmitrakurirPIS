
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { format, subDays, addDays } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar as CalendarIcon, TrendingUp, Package, CheckCircle, Clock, Percent, ArrowLeft, ArrowRight } from 'lucide-react';

// Mock data - replace with actual data fetching
const generateDailyData = (date: Date) => {
  const daySeed = date.getDate();
  return {
    date: format(date, "yyyy-MM-dd"),
    totalPackages: 20 + (daySeed % 5) - 2,
    deliveredPackages: 18 + (daySeed % 3) - 1,
    avgDeliveryTime: 120 + (daySeed % 20) - 10, // in minutes
    attendance: (daySeed % 10) < 8 ? 'Present' : 'Late', // Simple mock
  };
};

const today = new Date();
const initialPerformanceData = Array.from({ length: 30 }, (_, i) => generateDailyData(subDays(today, i))).reverse();

const COLORS_PERFORMANCE = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function PerformancePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [performanceData, setPerformanceData] = useState(initialPerformanceData);

  const overallStats = useMemo(() => {
    const total = performanceData.reduce((sum, day) => sum + day.totalPackages, 0);
    const delivered = performanceData.reduce((sum, day) => sum + day.deliveredPackages, 0);
    const totalDeliveryTime = performanceData.reduce((sum, day) => sum + day.avgDeliveryTime * day.deliveredPackages, 0);
    const totalDeliveredForAvgTime = performanceData.reduce((sum, day) => sum + (day.deliveredPackages > 0 ? day.deliveredPackages : 0), 0);
    
    return {
      allPackages: total,
      allDelivered: delivered,
      successRate: total > 0 ? (delivered / total) * 100 : 0,
      avgDeliveryTime: totalDeliveredForAvgTime > 0 ? totalDeliveryTime / totalDeliveredForAvgTime : 0,
      attendancePresent: performanceData.filter(d => d.attendance === 'Present').length,
      attendanceRate: performanceData.length > 0 ? (performanceData.filter(d => d.attendance !== 'Absent').length / performanceData.length) * 100 : 0,
    };
  }, [performanceData]);

  const weeklyChartData = useMemo(() => {
    const last7Days = performanceData.slice(-7);
    return last7Days.map(day => ({
      date: format(new Date(day.date), "dd/MM"),
      Dikirim: day.deliveredPackages,
      Total: day.totalPackages,
    }));
  }, [performanceData]);

  const dailyChartData = useMemo(() => {
    const selectedDayData = performanceData.find(d => d.date === (selectedDate ? format(selectedDate, "yyyy-MM-dd") : ''));
    if (!selectedDayData) return [{ name: 'Kosong', value: 0 }];
    return [
      { name: 'Terkirim', value: selectedDayData.deliveredPackages },
      { name: 'Belum/Gagal', value: selectedDayData.totalPackages - selectedDayData.deliveredPackages },
    ];
  }, [performanceData, selectedDate]);


  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false); // Close calendar after selection
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
                disabled={(date) => date > new Date() || date < subDays(new Date(), 60)} // Example: disable future dates and dates older than 60 days
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Package} title="Total Paket Dikirim (All Time)" value={overallStats.allPackages.toLocaleString()} />
        <StatCard icon={CheckCircle} title="Paket Berhasil Terkirim (All Time)" value={overallStats.allDelivered.toLocaleString()} />
        <StatCard icon={Percent} title="Rate Keberhasilan (All Time)" value={`${overallStats.successRate.toFixed(1)}%`} />
        <StatCard icon={Clock} title="Rata-rata Waktu Pengiriman" value={`${overallStats.avgDeliveryTime.toFixed(0)} min`} />
        <StatCard icon={CalendarIcon} title="Kehadiran (Present)" value={`${overallStats.attendancePresent} hari`} />
         <StatCard icon={TrendingUp} title="Rate Kehadiran" value={`${overallStats.attendanceRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Pengiriman Mingguan</CardTitle>
            <CardDescription>Jumlah paket dikirim dan total paket selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Dikirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performa Harian ({selectedDate ? format(selectedDate, "dd MMM yyyy") : 'Pilih Tanggal'})</CardTitle>
             <CardDescription>Detail pengiriman untuk tanggal yang dipilih.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate && performanceData.find(d => d.date === format(selectedDate, "yyyy-MM-dd")) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dailyChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                    {dailyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PERFORMANCE[index % COLORS_PERFORMANCE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} (${(props.payload.percent * 100).toFixed(1)}%)`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">Pilih tanggal untuk melihat detail performa harian.</p>
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

