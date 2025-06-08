
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AttendanceEntry } from '@/types';
import { mockAttendance } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, differenceInMinutes } from "date-fns"
import { Calendar as CalendarIcon, LogIn, LogOut, BarChart3, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LOCAL_STORAGE_ATTENDANCE_KEY = 'spxUserAttendanceLog';
const LOCAL_STORAGE_LAST_CHECK_IN_KEY = 'spxUserLastCheckInDate';

export default function AttendancePage() {
  const [attendanceLog, setAttendanceLog] = useState<AttendanceEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentTime, setCurrentTime] = useState<string>('');
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedLog = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
      if (storedLog) {
        setAttendanceLog(JSON.parse(storedLog));
      } else {
        setAttendanceLog(mockAttendance); 
        localStorage.setItem(LOCAL_STORAGE_ATTENDANCE_KEY, JSON.stringify(mockAttendance));
      }
    } catch (error) {
      console.error("Failed to load attendance log from localStorage:", error);
      setAttendanceLog(mockAttendance); 
    }
  }, []);

  useEffect(() => {
    if (isMounted) { 
        localStorage.setItem(LOCAL_STORAGE_ATTENDANCE_KEY, JSON.stringify(attendanceLog));
    }
  }, [attendanceLog, isMounted]);


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit'}));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayEntry = useMemo(() => {
    if (!isMounted) return undefined;
    return attendanceLog.find(entry => entry.date === format(new Date(), "yyyy-MM-dd"));
  }, [attendanceLog, isMounted]);

  const handleCheckIn = () => {
    if (!isMounted) return;
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
      status: now.getHours() < 9 ? 'On Time' : 'Late', 
    };
    
    setAttendanceLog(prev => {
        const newLog = [newEntry, ...prev.filter(e => e.date !== todayFormatted)];
        return newLog;
    });
    localStorage.setItem(LOCAL_STORAGE_LAST_CHECK_IN_KEY, todayFormatted);
    toast({ title: "Check-in Berhasil", description: `Anda berhasil check-in pukul ${timeFormatted}.` });
  };

  const handleCheckOut = () => {
    if (!isMounted) return;
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

    setAttendanceLog(prev => {
        const newLog = prev.map(entry => 
          entry.date === todayFormatted ? { ...entry, checkOutTime: timeFormatted } : entry
        );
        return newLog;
    });
    toast({ title: "Check-out Berhasil", description: `Anda berhasil check-out pukul ${timeFormatted}.` });
  };

  const calculateWorkingHours = (checkInTime?: string, checkOutTime?: string, entryDate?: string): string => {
    if (checkInTime && checkOutTime && entryDate) {
      try {
        const [year, month, day] = entryDate.split('-').map(Number);
        const [inHour, inMinute] = checkInTime.split(':').map(Number);
        const [outHour, outMinute] = checkOutTime.split(':').map(Number);

        const checkInDateTime = new Date(year, month - 1, day, inHour, inMinute);
        const checkOutDateTime = new Date(year, month - 1, day, outHour, outMinute);

        if (checkOutDateTime > checkInDateTime) {
          const diffMins = differenceInMinutes(checkOutDateTime, checkInDateTime);
          const hours = Math.floor(diffMins / 60);
          const minutes = diffMins % 60;
          return `${hours} jam ${minutes} mnt`;
        }
        return 'Invalid';
      } catch (e) {
        return 'Error';
      }
    }
    return '-';
  };

  const attendanceStats = useMemo(() => {
    if (!isMounted) return { onTime: 0, late: 0, absent: 0 }; 
    return {
      onTime: attendanceLog.filter(e => e.status === 'On Time' && e.checkInTime).length,
      late: attendanceLog.filter(e => e.status === 'Late').length,
      absent: attendanceLog.filter(e => e.status === 'Absent' && !e.checkInTime).length, // Ensure absent also considers no check-in
    };
  }, [attendanceLog, isMounted]);
  
  const totalDaysWithAttendanceRecord = useMemo(() => {
     if (!isMounted) return 0;
     // Count days where there's a check-in OR explicitly marked as absent
     return attendanceLog.filter(e => e.checkInTime || e.status === 'Absent').length;
  }, [attendanceLog, isMounted]);

  const attendanceRate = useMemo(() => {
    if (!isMounted || totalDaysWithAttendanceRecord === 0) return '0';
    const presentOrLate = attendanceLog.filter(e => e.checkInTime && (e.status === 'On Time' || e.status === 'Late')).length;
    return ((presentOrLate / totalDaysWithAttendanceRecord) * 100).toFixed(1);
  }, [attendanceLog, totalDaysWithAttendanceRecord, isMounted]);


  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

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
                <TableHead>Jam Kerja</TableHead>
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
                  <TableCell>{calculateWorkingHours(entry.checkInTime, entry.checkOutTime, entry.date)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      entry.status === 'On Time' ? 'default' :
                      entry.status === 'Late' ? 'destructive' : 'secondary' 
                    }
                    className={
                        entry.status === 'On Time' ? 'bg-green-500 hover:bg-green-600' : 
                        entry.status === 'Late' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                        entry.status === 'Absent' ? 'bg-red-500 hover:bg-red-600' : ''
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
