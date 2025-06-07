
"use client";

import { useState, useEffect } from 'react';
import type { AttendanceEntry } from '@/types';
import { mockAttendance } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon, LogIn, LogOut, BarChart3, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AttendancePage() {
  const [attendanceLog, setAttendanceLog] = useState<AttendanceEntry[]>(mockAttendance);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentTime, setCurrentTime] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit'}));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayEntry = attendanceLog.find(entry => entry.date === format(new Date(), "yyyy-MM-dd"));

  const handleCheckIn = () => {
    const now = new Date();
    const todayFormatted = format(now, "yyyy-MM-dd");
    const timeFormatted = format(now, "HH:mm");

    if (todayEntry && todayEntry.checkInTime) {
      toast({ variant: "destructive", title: "Sudah Check-in", description: "Anda sudah melakukan check-in hari ini." });
      return;
    }
    
    const newEntry: AttendanceEntry = {
      id: String(Date.now()),
      date: todayFormatted,
      checkInTime: timeFormatted,
      status: now.getHours() < 9 ? 'On Time' : 'Late', // Assuming 9 AM is cut-off for on-time
    };
    setAttendanceLog(prev => [newEntry, ...prev.filter(e => e.date !== todayFormatted)]);
    toast({ title: "Check-in Berhasil", description: `Anda berhasil check-in pukul ${timeFormatted}.` });
  };

  const handleCheckOut = () => {
    const now = new Date();
    const todayFormatted = format(now, "yyyy-MM-dd");
    const timeFormatted = format(now, "HH:mm");

    if (!todayEntry || !todayEntry.checkInTime) {
      toast({ variant: "destructive", title: "Belum Check-in", description: "Anda harus check-in terlebih dahulu." });
      return;
    }
    if (todayEntry.checkOutTime) {
       toast({ variant: "destructive", title: "Sudah Check-out", description: "Anda sudah melakukan check-out hari ini." });
      return;
    }

    setAttendanceLog(prev => prev.map(entry => 
      entry.date === todayFormatted ? { ...entry, checkOutTime: timeFormatted } : entry
    ));
    toast({ title: "Check-out Berhasil", description: `Anda berhasil check-out pukul ${timeFormatted}.` });
  };

  const attendanceStats = {
    onTime: attendanceLog.filter(e => e.status === 'On Time' && e.checkInTime).length,
    late: attendanceLog.filter(e => e.status === 'Late').length,
    absent: attendanceLog.filter(e => e.status === 'Absent').length,
  };
  const totalDays = attendanceLog.length;
  const attendanceRate = totalDays > 0 ? ((attendanceStats.onTime + attendanceStats.late) / totalDays * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Absensi Kehadiran</CardTitle>
          <CardDescription>Catat kehadiran Anda setiap hari kerja. Jam saat ini: <span className="font-semibold text-primary">{currentTime}</span></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          <Button onClick={handleCheckIn} size="lg" className="flex-1" disabled={!!todayEntry?.checkInTime}>
            <LogIn className="mr-2 h-5 w-5" /> Check-in
          </Button>
          <Button onClick={handleCheckOut} variant="outline" size="lg" className="flex-1" disabled={!todayEntry?.checkInTime || !!todayEntry?.checkOutTime}>
            <LogOut className="mr-2 h-5 w-5" /> Check-out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary"/>Performa Absensi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-green-100 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2"/>
            <p className="text-2xl font-bold">{attendanceStats.onTime}</p>
            <p className="text-sm text-muted-foreground">Tepat Waktu</p>
          </div>
           <div className="p-4 bg-yellow-100 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2"/>
            <p className="text-2xl font-bold">{attendanceStats.late}</p>
            <p className="text-sm text-muted-foreground">Terlambat</p>
          </div>
           <div className="p-4 bg-red-100 rounded-lg">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2"/>
            <p className="text-2xl font-bold">{attendanceStats.absent}</p>
            <p className="text-sm text-muted-foreground">Absen</p>
          </div>
           <div className="p-4 bg-blue-100 rounded-lg">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2"/>
            <p className="text-2xl font-bold">{attendanceRate}%</p>
            <p className="text-sm text-muted-foreground">Tingkat Kehadiran</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" /> Riwayat Absensi
          </CardTitle>
          <CardDescription>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pilih tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceLog
                .filter(entry => !selectedDate || entry.date === format(selectedDate, "yyyy-MM-dd"))
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{entry.checkInTime || '-'}</TableCell>
                  <TableCell>{entry.checkOutTime || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      entry.status === 'On Time' ? 'default' :
                      entry.status === 'Late' ? 'destructive' : 'secondary' // 'default' for success, 'destructive' for error/late, 'secondary' for neutral/absent
                    }
                    className={
                        entry.status === 'On Time' ? 'bg-green-500 hover:bg-green-600' : 
                        entry.status === 'Late' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                        'bg-red-500 hover:bg-red-600'
                    }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
