import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { StaffAttendance as AttendanceLog, StaffProfile } from '../../../core/domain/hr/hr.model';

export type AttendanceViewTab = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANALYTICS';

export interface DayAttendanceCell {
    date: string;
    record?: AttendanceLog;
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'WEEKEND' | 'OFF';
    durationStr: string;
    clockInStr: string;
    clockOutStr: string;
    hours: number;
}

export interface WeeklyStaffRow {
    staff: StaffProfile;
    days: DayAttendanceCell[];
    totalHours: number;
    daysPresent: number;
    daysLate: number;
    daysAbsent: number;
    punctualityRate: number;
}

export interface MonthlyStaffSummary {
    staff: StaffProfile;
    expectedDays: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    totalHours: number;
    overtimeHours: number;
    attendanceRate: number;
    punctualityRate: number;
}

@Component({
    selector: 'app-staff-attendance',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
    templateUrl: './staff-attendance.html',
})
export class StaffAttendancePage implements OnInit {
    private hrService = inject(HrService);

    // Active View Tab
    activeTab = signal<AttendanceViewTab>('DAILY');

    // Master Data
    logs = signal<AttendanceLog[]>([]);
    staffList = signal<StaffProfile[]>([]);
    isLoading = signal<boolean>(false);

    // Search & Filtering
    searchQuery = signal<string>('');
    selectedDepartment = signal<string>('');
    selectedStatus = signal<string>('');

    // Daily View Parameters
    selectedDate = signal<string>(this.getDateString(new Date()));

    // Weekly View Parameters
    selectedWeekDate = signal<string>(this.getDateString(new Date()));

    // Monthly View Parameters
    selectedMonth = signal<number>(new Date().getMonth() + 1);
    selectedYear = signal<number>(new Date().getFullYear());

    // Direct Quick Clock Terminal State
    clockStaffId = signal<string>('');
    clockMessage = signal<string>('');
    clockError = signal<string>('');
    isClocking = signal<boolean>(false);

    // Distinct Departments
    departments = computed(() => {
        const set = new Set<string>();
        for (const s of this.staffList()) {
            if (s.department) set.add(s.department);
        }
        return Array.from(set).sort();
    });

    // Filtered Staff Profiles
    filteredStaffList = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const dept = this.selectedDepartment();
        return this.staffList().filter(s => {
            const matchQuery = !query ||
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
                (s.job_title && s.job_title.toLowerCase().includes(query)) ||
                (s.department && s.department.toLowerCase().includes(query));
            const matchDept = !dept || s.department === dept;
            return matchQuery && matchDept;
        });
    });

    // Filtered Daily Logs
    filteredDailyLogs = computed(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const dept = this.selectedDepartment();
        const stat = this.selectedStatus();

        return this.logs().filter(log => {
            const staffName = log.staff ? `${log.staff.first_name} ${log.staff.last_name}`.toLowerCase() : '';
            const staffDept = log.staff?.department || '';
            const matchQuery = !query || staffName.includes(query) || (log.staff?.job_title && log.staff.job_title.toLowerCase().includes(query));
            const matchDept = !dept || staffDept === dept;
            const matchStat = !stat || log.status === stat;
            return matchQuery && matchDept && matchStat;
        });
    });

    // Daily Summary Statistics
    dailyTotalPresent = computed(() => this.filteredDailyLogs().filter(l => l.status === 'PRESENT').length);
    dailyTotalLate = computed(() => this.filteredDailyLogs().filter(l => l.status === 'LATE').length);
    dailyTotalAbsent = computed(() => this.filteredDailyLogs().filter(l => l.status === 'ABSENT').length);
    dailyAverageDuration = computed(() => {
        const logs = this.filteredDailyLogs().filter(l => l.clock_in && l.clock_out);
        if (logs.length === 0) return '0.0h';
        const totalMinutes = logs.reduce((acc, l) => {
            const diff = (new Date(l.clock_out!).getTime() - new Date(l.clock_in!).getTime()) / (1000 * 60);
            return acc + Math.max(0, diff);
        }, 0);
        const avgHours = (totalMinutes / logs.length) / 60;
        return `${avgHours.toFixed(1)}h`;
    });

    // Weekly Calculated Matrix
    weekDaysList = computed(() => {
        const baseDate = new Date(this.selectedWeekDate());
        const dayOfWeek = baseDate.getDay(); // 0 is Sunday
        // Determine Monday of the week
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() + mondayOffset);

        const days = [];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 6; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push({
                dateStr: this.getDateString(d),
                dayLabel: dayNames[i],
                dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                isToday: this.getDateString(d) === this.getDateString(new Date())
            });
        }
        return days;
    });

    weeklyStaffRows = computed<WeeklyStaffRow[]>(() => {
        const days = this.weekDaysList();
        const logs = this.logs();
        const staff = this.filteredStaffList();

        return staff.map(s => {
            let totalMinutes = 0;
            let daysPresent = 0;
            let daysLate = 0;
            let daysAbsent = 0;

            const dayCells: DayAttendanceCell[] = days.map(day => {
                const log = logs.find(l => l.staff_id === s.id && l.date.startsWith(day.dateStr));
                if (!log) {
                    return {
                        date: day.dateStr,
                        status: 'OFF',
                        durationStr: '—',
                        clockInStr: '—',
                        clockOutStr: '—',
                        hours: 0
                    };
                }

                let durationStr = '—';
                let hours = 0;
                if (log.clock_in && log.clock_out) {
                    const diffMs = new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime();
                    const mins = Math.max(0, diffMs / (1000 * 60));
                    totalMinutes += mins;
                    hours = Math.round((mins / 60) * 10) / 10;
                    const h = Math.floor(mins / 60);
                    const m = Math.round(mins % 60);
                    durationStr = `${h}h ${m}m`;
                }

                if (log.status === 'PRESENT') daysPresent++;
                else if (log.status === 'LATE') { daysLate++; daysPresent++; }
                else if (log.status === 'ABSENT') daysAbsent++;

                return {
                    date: day.dateStr,
                    record: log,
                    status: log.status,
                    durationStr,
                    clockInStr: log.clock_in ? new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
                    clockOutStr: log.clock_out ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
                    hours
                };
            });

            const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
            const totalWorkDaysRecorded = daysPresent + daysAbsent;
            const punctualityRate = totalWorkDaysRecorded > 0
                ? Math.round(((daysPresent - daysLate) / totalWorkDaysRecorded) * 100)
                : 100;

            return {
                staff: s,
                days: dayCells,
                totalHours,
                daysPresent,
                daysLate,
                daysAbsent,
                punctualityRate: Math.max(0, punctualityRate)
            };
        });
    });

    // Monthly Calculated Summary
    monthlyStaffSummaries = computed<MonthlyStaffSummary[]>(() => {
        const staff = this.filteredStaffList();
        const logs = this.logs();
        const month = this.selectedMonth();
        const year = this.selectedYear();

        // Calculate expected working days in the month (Mon-Fri)
        const daysInMonth = new Date(year, month, 0).getDate();
        let expectedWorkDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) expectedWorkDays++;
        }

        return staff.map(s => {
            const staffLogs = logs.filter(l => {
                if (l.staff_id !== s.id) return false;
                const d = new Date(l.date);
                return d.getFullYear() === year && (d.getMonth() + 1) === month;
            });

            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;
            let totalMinutes = 0;

            for (const log of staffLogs) {
                if (log.status === 'PRESENT') presentCount++;
                else if (log.status === 'LATE') { lateCount++; presentCount++; }
                else if (log.status === 'ABSENT') absentCount++;

                if (log.clock_in && log.clock_out) {
                    const diffMs = new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime();
                    totalMinutes += Math.max(0, diffMs / (1000 * 60));
                }
            }

            const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
            const standardHours = expectedWorkDays * 8;
            const overtimeHours = Math.max(0, Math.round((totalHours - standardHours) * 10) / 10);
            const attendanceRate = expectedWorkDays > 0 ? Math.round((presentCount / expectedWorkDays) * 100) : 100;
            const punctualityRate = presentCount > 0 ? Math.round(((presentCount - lateCount) / presentCount) * 100) : 100;

            return {
                staff: s,
                expectedDays: expectedWorkDays,
                presentCount,
                lateCount,
                absentCount,
                totalHours,
                overtimeHours,
                attendanceRate: Math.min(100, Math.max(0, attendanceRate)),
                punctualityRate: Math.min(100, Math.max(0, punctualityRate))
            };
        });
    });

    // Monthly Macro Metrics
    monthlyOverallAttendanceRate = computed(() => {
        const summaries = this.monthlyStaffSummaries();
        if (summaries.length === 0) return 0;
        const sum = summaries.reduce((acc, curr) => acc + curr.attendanceRate, 0);
        return Math.round(sum / summaries.length);
    });

    monthlyTotalHoursLogged = computed(() => {
        const summaries = this.monthlyStaffSummaries();
        return summaries.reduce((acc, curr) => acc + curr.totalHours, 0);
    });

    monthlyTotalOvertimeHours = computed(() => {
        const summaries = this.monthlyStaffSummaries();
        return summaries.reduce((acc, curr) => acc + curr.overtimeHours, 0);
    });

    ngOnInit() {
        this.loadStaff();
        this.loadDataForActiveTab();
    }

    setTab(tab: AttendanceViewTab) {
        this.activeTab.set(tab);
        this.loadDataForActiveTab();
    }

    loadStaff() {
        this.hrService.getStaffProfiles().subscribe({
            next: (res) => {
                this.staffList.set(res || []);
                if (res && res.length > 0 && !this.clockStaffId()) {
                    this.clockStaffId.set(res[0].id);
                }
            },
            error: () => {}
        });
    }

    loadDataForActiveTab() {
        this.isLoading.set(true);
        const tab = this.activeTab();

        let startDate = '';
        let endDate = '';

        if (tab === 'DAILY') {
            startDate = this.selectedDate();
            endDate = this.selectedDate();
        } else if (tab === 'WEEKLY') {
            const days = this.weekDaysList();
            startDate = days[0].dateStr;
            endDate = days[days.length - 1].dateStr;
        } else {
            // MONTHLY or ANALYTICS
            const m = this.selectedMonth();
            const y = this.selectedYear();
            const lastDay = new Date(y, m, 0).getDate();
            startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        this.hrService.getAttendanceLogs(startDate, endDate).subscribe({
            next: (res) => {
                this.logs.set(res || []);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    onDateChange() {
        this.loadDataForActiveTab();
    }

    onWeekChange(offsetWeeks: number = 0) {
        if (offsetWeeks !== 0) {
            const current = new Date(this.selectedWeekDate());
            current.setDate(current.getDate() + (offsetWeeks * 7));
            this.selectedWeekDate.set(this.getDateString(current));
        }
        this.loadDataForActiveTab();
    }

    onMonthChange(offsetMonths: number = 0) {
        if (offsetMonths !== 0) {
            let m = this.selectedMonth() + offsetMonths;
            let y = this.selectedYear();
            if (m > 12) { m = 1; y++; }
            if (m < 1) { m = 12; y--; }
            this.selectedMonth.set(m);
            this.selectedYear.set(y);
        }
        this.loadDataForActiveTab();
    }

    getMonthName(monthNum: number): string {
        const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return names[monthNum - 1] || `Month ${monthNum}`;
    }

    // Direct Quick Clock Terminal Actions
    clockInStaff(staffId?: string) {
        const targetId = staffId || this.clockStaffId();
        if (!targetId) {
            this.clockError.set('Please select a staff member.');
            return;
        }

        this.clockMessage.set('');
        this.clockError.set('');
        this.isClocking.set(true);

        this.hrService.clockIn(targetId).subscribe({
            next: (rec) => {
                this.isClocking.set(false);
                const timeStr = rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
                this.clockMessage.set(`Clock-in recorded at ${timeStr}`);
                this.loadDataForActiveTab();
                setTimeout(() => this.clockMessage.set(''), 4000);
            },
            error: (e) => {
                this.isClocking.set(false);
                this.clockError.set(e.error?.error || 'Clock-in failed. Please verify staff status.');
                setTimeout(() => this.clockError.set(''), 4000);
            }
        });
    }

    clockOutStaff(staffId?: string) {
        const targetId = staffId || this.clockStaffId();
        if (!targetId) {
            this.clockError.set('Please select a staff member.');
            return;
        }

        this.clockMessage.set('');
        this.clockError.set('');
        this.isClocking.set(true);

        this.hrService.clockOut(targetId).subscribe({
            next: (rec) => {
                this.isClocking.set(false);
                const timeStr = rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
                this.clockMessage.set(`Clock-out recorded at ${timeStr}`);
                this.loadDataForActiveTab();
                setTimeout(() => this.clockMessage.set(''), 4000);
            },
            error: (e) => {
                this.isClocking.set(false);
                this.clockError.set(e.error?.error || 'Clock-out failed. Staff must have an active clock-in.');
                setTimeout(() => this.clockError.set(''), 4000);
            }
        });
    }

    getStatusClass(status: string) {
        switch (status) {
            case 'PRESENT': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            case 'LATE':    return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
            case 'ABSENT':  return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
            default:        return 'bg-bg-tertiary text-text-muted border-border-primary';
        }
    }

    formatTime(t?: string): string {
        if (!t) return '—';
        return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getDuration(clockIn?: string, clockOut?: string): string {
        if (!clockIn || !clockOut) return '—';
        const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 1000 / 60;
        const h = Math.floor(diff / 60);
        const m = Math.round(diff % 60);
        return `${h}h ${m}m`;
    }

    // CSV Exports & Print
    exportDailyCSV() {
        const header = 'Staff Name,Department,Job Title,Date,Status,Clock In,Clock Out,Duty Duration,Source\n';
        const rows = this.filteredDailyLogs().map(log => {
            const name = log.staff ? `"${log.staff.first_name} ${log.staff.last_name}"` : '"Staff"';
            const dept = log.staff?.department ? `"${log.staff.department}"` : '""';
            const title = log.staff?.job_title ? `"${log.staff.job_title}"` : '""';
            const inTime = log.clock_in ? new Date(log.clock_in).toLocaleTimeString() : '—';
            const outTime = log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '—';
            const duration = this.getDuration(log.clock_in, log.clock_out);
            const source = log.is_biometric ? 'Biometric Device' : 'Web Terminal';
            return `${name},${dept},${title},${log.date},${log.status},${inTime},${outTime},${duration},${source}`;
        }).join('\n');

        this.downloadCSV(header + rows, `SchoolLinx_Daily_Staff_Attendance_${this.selectedDate()}.csv`);
    }

    exportWeeklyCSV() {
        const days = this.weekDaysList();
        const dayHeaders = days.map(d => `${d.dayLabel} (${d.dateStr})`).join(',');
        const header = `Staff Name,Department,Job Title,${dayHeaders},Total Hours Worked,Punctuality Rate\n`;

        const rows = this.weeklyStaffRows().map(row => {
            const name = `"${row.staff.first_name} ${row.staff.last_name}"`;
            const dept = `"${row.staff.department || ''}"`;
            const title = `"${row.staff.job_title || ''}"`;
            const dayValues = row.days.map(d => {
                if (d.status === 'OFF') return 'OFF';
                return `"${d.status} (${d.clockInStr}-${d.clockOutStr} / ${d.hours}h)"`;
            }).join(',');

            return `${name},${dept},${title},${dayValues},${row.totalHours}h,${row.punctualityRate}%`;
        }).join('\n');

        this.downloadCSV(header + rows, `SchoolLinx_Weekly_Staff_Attendance_${this.selectedWeekDate()}.csv`);
    }

    exportMonthlyCSV() {
        const m = this.selectedMonth();
        const y = this.selectedYear();
        const monthName = this.getMonthName(m);
        const header = `Staff ID,Full Name,Department,Job Title,Expected Work Days,Days Present,Late Arrivals,Absences,Total Hours Worked,Overtime Hours,Attendance %,Punctuality %\n`;

        const rows = this.monthlyStaffSummaries().map(s => {
            const id = s.staff.id.substring(0, 8);
            const name = `"${s.staff.first_name} ${s.staff.last_name}"`;
            const dept = `"${s.staff.department || ''}"`;
            const title = `"${s.staff.job_title || ''}"`;
            return `${id},${name},${dept},${title},${s.expectedDays},${s.presentCount},${s.lateCount},${s.absentCount},${s.totalHours},${s.overtimeHours},${s.attendanceRate}%,${s.punctualityRate}%`;
        }).join('\n');

        this.downloadCSV(header + rows, `SchoolLinx_Monthly_Staff_Attendance_${monthName}_${y}.csv`);
    }

    printAttendanceReport() {
        window.print();
    }

    private downloadCSV(csvContent: string, fileName: string) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private getDateString(d: Date): string {
        return d.toISOString().split('T')[0];
    }
}
