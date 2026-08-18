import { Injectable, inject } from '@angular/core';
import { Observable, of, forkJoin, map, catchError } from 'rxjs';
import { IntelligenceService } from '../../../core/infrastructure/intelligence/intelligence.service';
import { InsightsService } from '../../../core/infrastructure/insights/insights.service';
import { HouseService } from '../../../core/infrastructure/house/house.service';
import { LogisticsService } from '../../../core/infrastructure/logistics/logistics.service';
import { FiscalService } from '../../../core/infrastructure/fiscal/fiscal.service';
import { HrService } from '../../../core/infrastructure/hr/hr.service';
import { LibraryService } from '../../../core/infrastructure/library/library.service';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    data?: any;
    type?: 'text' | 'student-list' | 'kpi-summary' | 'error';
}

export interface Intent {
    name: string;
    patterns: RegExp[];
    handler: () => Observable<{ content: string; data?: any; type?: ChatMessage['type'] }>;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
    private intelligence = inject(IntelligenceService);
    private insights = inject(InsightsService);
    private houseService = inject(HouseService);
    private logisticsService = inject(LogisticsService);
    private fiscalService = inject(FiscalService);
    private hrService = inject(HrService);
    private libraryService = inject(LibraryService);

    private intents: Intent[] = [
        {
            name: 'at_risk_students',
            patterns: [
                /at.?risk/i,
                /drop.?out/i,
                /struggling students/i,
                /failing students/i,
                /who.*(risk|struggling|failing)/i,
            ],
            handler: () =>
                this.insights.getAtRiskStudents().pipe(
                    map(students => ({
                        content: students.length === 0
                            ? 'Great news! No students are currently flagged as at-risk.'
                            : `Found **${students.length} at-risk student${students.length > 1 ? 's' : ''}**. Here's the breakdown:`,
                        data: students.slice(0, 8),
                        type: 'student-list' as const,
                    })),
                    catchError(() => of({ content: 'Could not fetch at-risk data. The analytics service may be unavailable.', type: 'error' as const }))
                ),
        },
        {
            name: 'kpi_summary',
            patterns: [
                /kpi|overview|summary|dashboard/i,
                /how many students/i,
                /total students/i,
                /school stats/i,
                /school overview/i,
            ],
            handler: () =>
                this.intelligence.getKPIs().pipe(
                    map(kpi => ({
                        content: `Here's the current institutional snapshot:`,
                        data: kpi,
                        type: 'kpi-summary' as const,
                    })),
                    catchError(() => of({ content: 'Could not fetch KPI data.', type: 'error' as const }))
                ),
        },
        {
            name: 'attendance',
            patterns: [
                /attendance/i,
                /absent/i,
                /present/i,
                /who.*(missed|skipped)/i,
            ],
            handler: () =>
                this.intelligence.getKPIs().pipe(
                    map(kpi => ({
                        content: `**Attendance Overview**\n\nThe school-wide average attendance rate is **${kpi.average_attendance?.toFixed(1)}%**.\n\nStudents below 75% are flagged in the At-Risk dashboard. Ask me *"show at-risk students"* to see the list.`,
                        type: 'text' as const,
                    })),
                    catchError(() => of({ content: 'Could not fetch attendance data.', type: 'error' as const }))
                ),
        },
        {
            name: 'grades',
            patterns: [
                /grade|gpa|performance|score/i,
                /academic performance/i,
            ],
            handler: () =>
                this.intelligence.getKPIs().pipe(
                    map(kpi => ({
                        content: `**Academic Performance**\n\nSchool-wide average GPA is **${kpi.average_gpa?.toFixed(2)}**.\n\nFor individual student performance, navigate to **Analytics → At-Risk Dashboard** or a specific student profile.`,
                        type: 'text' as const,
                    })),
                    catchError(() => of({ content: 'Could not fetch grade data.', type: 'error' as const }))
                ),
        },
        {
            name: 'revenue',
            patterns: [
                /revenue|income|payment|financial|money|fees/i,
                /how much|collected/i,
            ],
            handler: () =>
                this.intelligence.getKPIs().pipe(
                    map(kpi => ({
                        content: `**Financial Summary**\n\nTotal revenue collected this term: **₵${kpi.total_revenue?.toLocaleString()}**.\n\nFor detailed fiscal reports, visit the **Financial Ledger** module.`,
                        type: 'text' as const,
                    })),
                    catchError(() => of({ content: 'Could not fetch financial data.', type: 'error' as const }))
                ),
        },
        {
            name: 'course_demand',
            patterns: [
                /course demand/i,
                /popular (courses|subjects)/i,
                /teacher shortage/i,
                /projected demand/i,
            ],
            handler: () =>
                this.intelligence.getCourseDemand().pipe(
                    map(demand => {
                        const shortages = demand.filter(d => d.teacher_shortage);
                        const topCourses = [...demand].sort((a, b) => b.projected_demand - a.projected_demand).slice(0, 3);
                        
                        let msg = `**Course Demand & Forecasting**\n\n`;
                        if (topCourses.length > 0) {
                            msg += `📈 Top projected courses: ${topCourses.map(c => `**${c.subject_name}**`).join(', ')}\n\n`;
                        }
                        if (shortages.length > 0) {
                            msg += `⚠️ **Teacher shortage predicted** for: ${shortages.map(c => c.subject_name).join(', ')}`;
                        } else {
                            msg += `✅ No teacher shortages predicted.`;
                        }
                        
                        return {
                            content: msg,
                            type: 'text' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch course demand data.', type: 'error' as const }))
                ),
        },
        {
            name: 'fee_debt',
            patterns: [
                /fee debt/i,
                /owes money/i,
                /defaulters/i,
                /unpaid fees/i,
                /debt/i,
            ],
            handler: () =>
                this.insights.getAtRiskStudents().pipe(
                    map(students => {
                        const debtors = students.filter(s => s.fee_debt > 0);
                        if (debtors.length === 0) {
                            return { content: 'No students currently have outstanding fee debt.', type: 'text' as const };
                        }
                        
                        const totalDebt = debtors.reduce((sum, s) => sum + s.fee_debt, 0);
                        return {
                            content: `Found **${debtors.length} student${debtors.length > 1 ? 's' : ''}** with outstanding fee debt. Total outstanding: **₵${totalDebt.toLocaleString()}**. Here are the top cases:`,
                            data: debtors.sort((a, b) => b.fee_debt - a.fee_debt).slice(0, 8),
                            type: 'student-list' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch fee debt data.', type: 'error' as const }))
                ),
        },
        {
            name: 'house_points',
            patterns: [
                /house points/i,
                /leaderboard/i,
                /winning house/i,
                /championship/i,
                /house rankings/i,
            ],
            handler: () =>
                this.houseService.getLeaderboard().pipe(
                    map(houses => {
                        if (!houses || houses.length === 0) {
                            return { content: 'No house point data available.', type: 'text' as const };
                        }
                        
                        const winner = houses[0];
                        let msg = `🏆 **House Points Leaderboard**\n\n`;
                        msg += `Currently in 1st place: **${winner.name}** with **${winner.total_points}** points!\n\n`;
                        
                        msg += `**Current Standings:**\n`;
                        houses.forEach((h, i) => {
                            msg += `${i + 1}. ${h.name} - ${h.total_points} pts\n`;
                        });
                        
                        return {
                            content: msg,
                            type: 'text' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch house points data.', type: 'error' as const }))
                ),
        },
        {
            name: 'bus_routes',
            patterns: [
                /bus route/i,
                /transport/i,
                /buses/i,
                /bus stops/i,
                /bus tracking/i,
            ],
            handler: () =>
                this.logisticsService.getRoutes().pipe(
                    map(routes => {
                        if (!routes || routes.length === 0) {
                            return { content: 'No active bus routes available.', type: 'text' as const };
                        }
                        
                        let msg = `🚌 **School Bus Routes**\n\n`;
                        msg += `We currently have **${routes.length} active routes**:\n\n`;
                        
                        routes.slice(0, 5).forEach((r, i) => {
                            const routeIdStr = r.id ? r.id.slice(0, 4) : String(i + 1);
                            msg += `• Route ${routeIdStr}: ${r.name || 'Unnamed Route'} (Driver: ${r.driver_name || 'N/A'})\n`;
                        });
                        
                        if (routes.length > 5) {
                            msg += `\n*...and ${routes.length - 5} more.*`;
                        }
                        
                        return {
                            content: msg,
                            type: 'text' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch transport data.', type: 'error' as const }))
                ),
        },
        {
            name: 'daily_bills',
            patterns: [
                /daily bill/i,
                /pending bill/i,
                /today's bills/i,
                /bills to collect/i,
                /collection/i,
            ],
            handler: () =>
                this.fiscalService.getTodaysBills().pipe(
                    map(data => {
                        let msg = `🧾 **Daily Bills & Collections (Today)**\n\n`;
                        msg += `Total Amount Billed: **₵${data.total.toLocaleString()}**\n`;
                        msg += `Total Collected: **₵${data.paid.toLocaleString()}**\n`;
                        msg += `Total Pending: **₵${data.pending.toLocaleString()}**\n\n`;
                        
                        if (data.bills && data.bills.length > 0) {
                            const pendingCount = data.bills.filter(b => b.status === 'PENDING').length;
                            msg += `There are **${pendingCount} pending bills** waiting to be collected today.`;
                        } else {
                            msg += `No bills generated for today.`;
                        }
                        
                        return {
                            content: msg,
                            type: 'text' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch daily bills data.', type: 'error' as const }))
                ),
        },
        {
            name: 'leave_requests',
            patterns: [
                /leave request/i,
                /staff leave/i,
                /pending leave/i,
                /time off/i,
                /vacation/i,
            ],
            handler: () =>
                this.hrService.getLeaveRequests().pipe(
                    map(requests => {
                        const pending = requests.filter(r => r.status === 'PENDING');
                        if (pending.length === 0) {
                            return { content: 'There are currently no pending staff leave requests.', type: 'text' as const };
                        }
                        
                        let msg = `🏖️ **Pending Staff Leave Requests**\n\n`;
                        msg += `There are **${pending.length} pending leave requests** requiring approval:\n\n`;
                        
                        pending.slice(0, 5).forEach(r => {
                            const staffName = r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : 'Unknown Staff';
                            msg += `• **${staffName}**: ${r.leave_type} (${r.start_date} to ${r.end_date})\n`;
                        });
                        
                        if (pending.length > 5) {
                            msg += `\n*...and ${pending.length - 5} more.*`;
                        }
                        
                        return {
                            content: msg,
                            type: 'text' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch leave requests data.', type: 'error' as const }))
                ),
        },
        {
            name: 'library_loans',
            patterns: [
                /library loan/i,
                /overdue book/i,
                /borrowed book/i,
                /library/i,
            ],
            handler: () =>
                this.libraryService.getActiveLoans().pipe(
                    map(loans => {
                        const overdue = loans.filter(l => l.status === 'OVERDUE');
                        if (loans.length === 0) {
                            return { content: 'There are currently no active library loans.', type: 'text' as const };
                        }
                        
                        let msg = `📚 **Library Activity**\n\n`;
                        msg += `Currently, there are **${loans.length} total active loans**.\n`;
                        
                        if (overdue.length > 0) {
                            msg += `⚠️ **${overdue.length} books are OVERDUE**:\n\n`;
                            overdue.slice(0, 5).forEach(o => {
                                const bookTitle = o.book?.title || 'Unknown Book';
                                const studentName = o.student ? `${o.student.first_name} ${o.student.last_name}` : 'Unknown Student';
                                msg += `• **${bookTitle}** (Borrowed by: ${studentName}, Due: ${o.due_date})\n`;
                            });
                            
                            if (overdue.length > 5) {
                                msg += `\n*...and ${overdue.length - 5} more overdue books.*`;
                            }
                        } else {
                            msg += `\n✅ Good news! There are no overdue books.`;
                        }
                        
                        return {
                            content: msg,
                            type: 'text' as const,
                        };
                    }),
                    catchError(() => of({ content: 'Could not fetch library loans data.', type: 'error' as const }))
                ),
        },
        {
            name: 'how_to_academic_period',
            patterns: [
                /how.*(set|create|add|configure).*(academic|term|period|year)/i,
                /academic period/i,
                /how.*term/i,
                /create.*academic year/i,
                /set up term/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCC5 **How to Set Up Academic Periods**\n\n**Step 1:** Go to **Settings \u2192 Academic Periods** (navigate to \`/academic-periods\`).\n\n**Step 2:** Click **\"+ New Academic Year\"**, enter the year name (e.g., *2025/2026*) and dates.\n\n**Step 3:** Under the academic year, click **\"+ Add Term\"**. Enter the term name, start date, and end date.\n\n**Step 4:** Set one term as **Active** by clicking the toggle. This controls which term fees and grades are posted to.\n\n> \uD83D\uDCA1 **Tip:** You must have an active academic year AND an active term before generating fees or recording grades.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_fees',
            patterns: [
                /how.*(set|configure|create|add|generate).*(fee|payment|bill)/i,
                /how.*charge students/i,
                /how.*generate fee/i,
                /fee structure/i,
                /how.*invoice/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCB3 **How to Set Up & Generate Fees**\n\n**Step 1:** Go to **Finance \u2192 Configure Fees** and click **\"+ Add Fee Structure\"**.\n\n**Step 2:** Select a **Level/Class**, enter the fee name (e.g., *Tuition*), amount, and link it to an Academic Period.\n\n**Step 3:** Once structures are configured, go to **Finance \u2192 Dashboard** and click **\"Generate Term Fees\"** to auto-create fee records for all enrolled students.\n\n**Step 4:** Students' fee records will appear under **Finance \u2192 Records**. Record payments by clicking any record and selecting **\"Record Payment\"**.\n\n> \uD83D\uDCA1 **Tip:** Use **\"Generate Daily Bills\"** to handle transport/canteen charges on a per-day basis.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_enroll_student',
            patterns: [
                /how.*(enroll|admit|register|add|create).*(student|pupil)/i,
                /add a student/i,
                /new student/i,
                /student admission/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDF93 **How to Enroll a New Student**\n\n**Step 1:** Go to **Students \u2192 Student List** and click **\"+ Add Student\"**.\n\n**Step 2:** Fill in personal details (name, date of birth, gender, etc.) and click **Save**.\n\n**Step 3:** On the student profile, click **\"Assign to Class\"** to place them in a class for the active academic period.\n\n**Step 4:** Go to **Finance \u2192 Dashboard** and generate fees for the student, or use **\"Generate Term Fees\"** to batch-generate for all students.\n\n**Step 5 (Optional):** Link a parent/guardian under the **\"Guardians\"** tab and activate their parent portal access.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_attendance',
            patterns: [
                /how.*(take|mark|record|track).*(attendance|roll call)/i,
                /how.*absent/i,
                /how.*attendance work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCDD **How to Mark Attendance**\n\n**For Teachers:**\n\n**Step 1:** Go to **Teacher Portal \u2192 Attendance** or click the Attendance tile on your dashboard.\n**Step 2:** Select your **Class** and the **Date** (defaults to today).\n**Step 3:** Mark each student as Present, Absent, or Late using the toggles.\n**Step 4:** Click **\"Submit\"** to save. Records sync automatically — even offline!\n\n**For Admins:**\n\nGo to **Reports \u2192 Attendance** to view class-wide or school-wide summaries and export to PDF/Excel.\n\n> \uD83D\uDCA1 **Tip:** Students below 75% attendance are auto-flagged as **At-Risk**.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_grades',
            patterns: [
                /how.*(enter|record|add|submit|upload).*(grade|score|result|mark)/i,
                /how.*gradebook/i,
                /how.*result.*work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCCA **How to Enter Grades**\n\n**Step 1:** Go to **Teacher Portal \u2192 Gradebook**.\n\n**Step 2:** Select the **Subject** and **Class** you are grading.\n\n**Step 3:** Click **\"+ Add Assessment\"** to create an entry (e.g., *Mid-Term Exam*, *Class Test 1*).\n\n**Step 4:** Enter each student's score in the score column and click **\"Save All\"**.\n\n**Step 5:** The system automatically calculates GPAs and updates the at-risk dashboard.\n\n> \uD83D\uDCA1 **Tip:** Use **\"Bulk Upload\"** to import scores from a CSV file for faster entry.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_sms',
            patterns: [
                /how.*(send|blast|broadcast).*(sms|message|text)/i,
                /how.*communicate.*(parent|guardian|student)/i,
                /how.*notify parent/i,
                /how.*campaign/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCAC **How to Send SMS / Bulk Messages**\n\n**Single message:**\n\n**Step 1:** Go to **Communications \u2192 Messages** and click **\"+ New Message\"**.\n**Step 2:** Search for a student, parent, or teacher. Type your message and click **Send**.\n\n**Bulk broadcast:**\n\n**Step 1:** Go to **Communications \u2192 Campaigns** and click **\"+ New Campaign\"**.\n**Step 2:** Choose an audience filter (e.g., *All Parents of Form 3*, *Students with fee balance > 0*).\n**Step 3:** Write your message and select **SMS** or **WhatsApp** as the channel.\n**Step 4:** Click **\"Send Now\"** or schedule for later.\n\n> \uD83D\uDCA1 **Tip:** Use the **WhatsApp Inbox** to view and reply to inbound parent messages.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_payroll',
            patterns: [
                /how.*(run|process|generate).*(payroll|salary|pay staff)/i,
                /how.*pay teacher/i,
                /how.*payroll work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCBC **How to Process Monthly Payroll**\n\n**Step 1:** Go to **HR \u2192 Payroll Manager**.\n\n**Step 2:** Select the **Month** and **Year** to process payroll for.\n\n**Step 3:** Click **\"Process Payroll\"**. The system calculates gross pay, deductions (tax, SSNIT), and net pay for each staff member.\n\n**Step 4:** Review the payroll summary. Click any record to see a full breakdown.\n\n**Step 5:** Click **\"Mark as Paid\"** after disbursing salaries. Staff can then download their payslips from their portal.\n\n> \uD83D\uDCA1 **Tip:** Configure all deduction types and allowances under **HR \u2192 Settings** before running payroll.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_parent_portal',
            patterns: [
                /how.*(activate|enable|set up|give access).*(parent|guardian).*(portal|account|login)/i,
                /parent portal/i,
                /how.*parent.*login/i,
                /how.*guardian.*access/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDC68\u200D\uD83D\uDC67 **How to Activate the Parent Portal**\n\n**Step 1:** Open the student profile from **Students \u2192 Student List**.\n\n**Step 2:** Click the **\"Guardians\"** tab and add the parent's name, phone number, and email.\n\n**Step 3:** Click **\"Activate Portal Access\"**. The system generates login credentials and sends them via SMS.\n\n**Step 4:** The parent logs in to view attendance, grades, fee balance, and newsletters.\n\n> \uD83D\uDCA1 **Tip:** Parents can subscribe to automated weekly newsletters. Go to **Communications \u2192 Newsletters** to manage subscriptions.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_add_teacher',
            patterns: [
                /how.*(add|create|register|onboard).*(teacher|staff|tutor)/i,
                /add a teacher/i,
                /new teacher/i,
                /teacher account/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDC68\u200D\uD83C\uDFEB **How to Add a Teacher / Staff Member**\n\n**Step 1:** Go to **HR \u2192 Staff Directory** and click **\"+ Add Staff\"**.\n\n**Step 2:** Fill in the staff's personal details, job title, department, and base salary. Click **Save**.\n\n**Step 3:** To give them a **Teacher Portal login**, go to **Students \u2192 Teachers** (or **HR \u2192 Staff**), find the teacher, and click **\"Activate Teacher Portal\"**.\n\n**Step 4:** The system generates a temporary password and sends it to them via SMS.\n\n**Step 5:** Assign them to classes under **Academic \u2192 Class Assignments**.\n\n> \uD83D\uDCA1 **Tip:** You can reset a teacher's password at any time from their profile page.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_house_points',
            patterns: [
                /how.*(set up|create|add|configure).*(house|house point)/i,
                /how.*(award|assign|give).*(point|merit)/i,
                /how.*house.*work/i,
                /how.*leaderboard.*work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDFC6 **How to Use the House Points System**\n\n**Step 1:** Go to **Connectivity \u2192 House Points** (or navigate to \`/house-points\`).\n\n**Step 2:** Click **\"+ Create House\"** to add houses (e.g., *Eagles*, *Lions*). Set a name, color, and crest icon.\n\n**Step 3:** Click **\"Assign Students\"** to place students into their respective houses.\n\n**Step 4:** To award points, click **\"+ Award Points\"**, select the house, enter the points, and add a reason (e.g., *Science Fair 1st Place*).\n\n**Step 5:** The live leaderboard updates instantly and is visible on the **House Points** page.\n\n> \uD83D\uDCA1 **Tip:** Teachers can also award points from their portal. Points auto-aggregate on the championship board.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_transport',
            patterns: [
                /how.*(set up|add|create|configure).*(bus|route|transport)/i,
                /how.*assign.*bus/i,
                /how.*transport.*work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDE8C **How to Set Up School Transport**\n\n**Step 1:** Go to **Operations \u2192 Logistics** and click the **Transport** tab.\n\n**Step 2:** Click **\"+ Add Route\"**. Enter the route name, driver name, vehicle info, and daily fee.\n\n**Step 3:** To assign a student to a route, go to the student's profile and click **\"Assign Transport\"**, then select the route and pick-up/drop-off points.\n\n**Step 4:** To generate daily transport bills, go to **Finance \u2192 Dashboard \u2192 Daily Bills** and click **\"Generate Daily Bills by Route\"**.\n\n> \uD83D\uDCA1 **Tip:** Walk-in (non-bus) students can be billed separately using **\"Generate Daily Bills for Walk-Ins\"**.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_wallet',
            patterns: [
                /how.*(top.?up|add money|recharge|fund).*(wallet|balance)/i,
                /how.*wallet.*work/i,
                /how.*canteen.*pay/i,
                /how.*cashless/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCB3 **How to Use the Digital Wallet & Canteen**\n\n**Top-Up a Student's Wallet:**\n\n**Step 1:** Go to **Finance \u2192 Digital Wallet** (or click the Wallet tile in the Operations Hub).\n**Step 2:** Search for the student using the search bar.\n**Step 3:** Click **\"Top Up Wallet\"**, enter the amount and a description, then click **Confirm**.\n\n**Canteen Checkout:**\n\n**Step 1:** At the **Finance \u2192 Digital Wallet** screen, select a student.\n**Step 2:** Click **\"Canteen Purchase\"**, enter the item and amount, then click **\"Charge\"**.\n**Step 3:** The amount is instantly deducted and the parent receives an SMS notification.\n\n> \uD83D\uDCA1 **Tip:** Parents can top-up wallets via mobile money through the parent portal.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_reports',
            patterns: [
                /how.*(generate|export|download|print).*(report|pdf|excel|csv)/i,
                /how.*report.*work/i,
                /how.*print.*result/i,
                /how.*export/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCC4 **How to Generate & Export Reports**\n\n**Student Report Cards:**\n• Go to **Students \u2192 Student Profile \u2192 Reports** and click **\"Print Report Card\"** to download a PDF.\n\n**Fee Bills & Invoices:**\n• Go to **Finance \u2192 Records**, click a student's record and select **\"Print Bill\"** or **\"Get Receipt\"**.\n• For an entire class, go to **Finance \u2192 Dashboard \u2192 Print Class Bills**.\n\n**Attendance Reports:**\n• Go to **Reports \u2192 Attendance** and filter by class, date range, or student. Click **\"Export to Excel\"**.\n\n**Payslips:**\n• Go to **HR \u2192 Payroll Manager**, select a processed payroll, and click **\"Download Payslip\"**.\n\n> \uD83D\uDCA1 **Tip:** Parent newsletters are auto-generated with key stats every Friday from **Communications \u2192 Newsletters**.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_timetable',
            patterns: [
                /how.*(set up|create|build|configure).*(timetable|schedule|class schedule)/i,
                /how.*class.*schedule/i,
                /how.*period.*schedule/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDDD3\uFE0F **How to Set Up a Class Timetable**\n\n**Step 1:** Go to **Academic \u2192 Timetable**.\n\n**Step 2:** Click **\"+ Add Entry\"** and select the **Class**, **Subject**, **Teacher**, **Day of Week**, **Start Time**, **End Time**, and **Room**.\n\n**Step 3:** Repeat for each subject/period until the week is fully scheduled.\n\n**Step 4:** Teachers and students can view their timetable from their respective portals under the **\"Timetable\"** or **\"Schedule\"** tab.\n\n> \uD83D\uDCA1 **Tip:** Timetable entries are linked to teacher assignments, so teachers only see subjects they are assigned to teach.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_library',
            patterns: [
                /how.*(add|catalog|register).*(book|resource)/i,
                /how.*(issue|lend|loan).*(book)/i,
                /how.*library.*work/i,
                /how.*return.*book/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCDA **How to Use the Library Module**\n\n**Adding Books to the Catalog:**\n\n**Step 1:** Go to **Academic \u2192 Library** and click **\"+ Add Book\"**.\n**Step 2:** Enter the ISBN, barcode, title, author, category, and number of copies. Click **Save**.\n\n**Issuing a Loan:**\n\n**Step 1:** Click **\"Issue Loan\"**, scan or type the book barcode, then search for the student borrowing it.\n**Step 2:** Click **\"Confirm Loan\"**. The system records the loan date and auto-calculates the due date.\n\n**Returning a Book:**\n\n**Step 1:** Go to **Active Loans**, find the loan and click **\"Mark Returned\"**.\n\n> \uD83D\uDCA1 **Tip:** Click **\"Audit Overdue\"** to automatically flag loans past their due date as overdue.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_biometric',
            patterns: [
                /how.*(set up|use|configure|register).*(biometric|fingerprint|face|rfid)/i,
                /how.*biometric.*work/i,
                /how.*clock.*(in|out)/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDD11 **How to Use the Biometric System**\n\n**Staff Clock-In / Clock-Out:**\n\n**Step 1:** Go to **Operations \u2192 Biometric Hub**.\n**Step 2:** Staff can click **\"Clock In\"** when they arrive and **\"Clock Out\"** when they leave.\n**Step 3:** Biometric-verified entries are marked with a \uD83D\uDD12 lock icon for audit purposes.\n\n**Viewing Attendance Logs:**\n\n**Step 1:** Go to **HR \u2192 Staff Attendance** and filter by staff member or date range.\n**Step 2:** Export the log for payroll deduction processing.\n\n**For Physical Biometric Devices:**\n\n• The system supports RFID/NFC clock-in via the \`is_biometric: true\` flag on API requests. Contact your hardware vendor to configure the device to POST to \`/api/hr/attendance/clock-in\`.\n\n> \uD83D\uDCA1 **Tip:** Late clock-ins are automatically flagged in the attendance log.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_behavior',
            patterns: [
                /how.*(log|record|track|report).*(behav|incident|disciplin|misconduct)/i,
                /how.*demerit/i,
                /how.*suspend/i,
                /behavior.*tracking/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDEA8 **How to Track Student Behavior & Incidents**\n\n**Logging an Incident:**\n\n**Step 1:** Go to **Students \u2192 Student Profile** and click the **\"Welfare\"** tab.\n\n**Step 2:** Click **\"+ Log Behavior\"** and fill in the incident type (e.g., *Disruption*, *Late to class*), a description, and the severity level.\n\n**Step 3:** Click **Save**. The incident is timestamped and linked to the student's permanent record.\n\n**Viewing Behavior History:**\n\n**Step 1:** Go to **Students \u2192 Student Profile \u2192 Welfare \u2192 Behavior Log** to see all past incidents.\n\n> \uD83D\uDCA1 **Tip:** Repeated behavior incidents contribute to the student's **At-Risk** score. Watch the analytics dashboard for patterns.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_health',
            patterns: [
                /how.*(record|track|update|manage).*(health|medical|sick|illness|condition)/i,
                /how.*medical.*record/i,
                /health.*module/i,
                /how.*allerg/i,
            ],
            handler: () =>
                of({
                    content: `\u2695\uFE0F **How to Manage Student Health Records**\n\n**Step 1:** Go to **Students \u2192 Student Profile** and click the **\"Welfare\"** tab.\n\n**Step 2:** Click **\"Update Health Record\"** to record:\n• Blood group\n• Known allergies\n• Medical conditions (e.g., *Asthma*, *Epilepsy*)\n• Emergency contact details\n\n**Step 3:** Click **Save**. This record is accessible to the school nurse and administrators.\n\n**Sick Bay Visits:**\n\nUse the **Welfare \u2192 Health** module to log sick bay visits, medication administered, and follow-up actions.\n\n> \uD83D\uDCA1 **Tip:** Health records are kept confidential — only Admin and designated welfare staff can view them.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_subjects',
            patterns: [
                /how.*(add|create|configure|set up).*(subject|course|curriculum)/i,
                /how.*curriculum.*work/i,
                /how.*subject.*class/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCDA **How to Set Up Subjects & Curriculum**\n\n**Adding Subjects:**\n\n**Step 1:** Go to **Academic \u2192 Subjects** and click **\"+ Add Subject\"**.\n\n**Step 2:** Enter the subject name (e.g., *Mathematics*), a short code (e.g., *MATH101*), and credit hours. Click **Save**.\n\n**Assigning Subjects to Classes:**\n\n**Step 1:** Go to **Academic \u2192 Class Management** and select a class.\n\n**Step 2:** Click **\"Assign Subjects\"** and select from the subject list. Link a teacher to each subject.\n\n**Curriculum Tracking:**\n\n• Go to **Academic \u2192 Curriculum** to track learning objectives and topic coverage per class.\n\n> \uD83D\uDCA1 **Tip:** Subjects must be created before you can set up a timetable or create grade assessments.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_facilities',
            patterns: [
                /how.*(add|create|book|manage|reserve).*(room|facility|facilities|lab|hall)/i,
                /how.*room.*booking/i,
                /how.*campus.*work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDFEB **How to Manage Campus Facilities**\n\n**Adding Rooms/Facilities:**\n\n**Step 1:** Go to **Operations \u2192 Facilities** and click **\"+ Add Facility\"**.\n\n**Step 2:** Enter the facility name (e.g., *Science Lab*, *Main Hall*), type, capacity, and campus.\n\n**Booking a Facility:**\n\n**Step 1:** On the **Facilities** page, click **\"+ Book\"** on the facility you want.\n**Step 2:** Select the date, time range, and the event or class it is booked for.\n**Step 3:** Click **Confirm Booking**. The system prevents double-bookings automatically.\n\n> \uD83D\uDCA1 **Tip:** Timetable entries are automatically linked to rooms. Avoid scheduling the same room at the same time.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_dashboard',
            patterns: [
                /how.*(customize|customise|arrange|edit|configure).*(dashboard|bento|layout|widget|card)/i,
                /how.*dashboard.*work/i,
                /how.*rearrange/i,
                /how.*add.*widget/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCCA **How to Customize Your Dashboard**\n\nThe dashboard uses a **Bento Grid** layout that you can fully personalize.\n\n**Step 1:** On the main Dashboard page, click the **\"Edit Layout\"** button (pencil icon) in the top right.\n\n**Step 2:** You will see cards outlined in dashed borders — this means **drag mode is active**.\n\n**Step 3:** Drag any card to reorder it anywhere on the grid.\n\n**Step 4:** Use the **\"+ Add Widget\"** panel to add new tiles (e.g., *Attendance Chart*, *Revenue Tracker*, *At-Risk Count*).\n\n**Step 5:** Click **\"Save Layout\"** to persist your changes.\n\n> \uD83D\uDCA1 **Tip:** Each user role (Admin, Teacher, Bursar) has their own default layout. Admins can set default layouts for all users.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_analytics',
            patterns: [
                /how.*(use|read|understand|navigate).*(analytic|at.?risk|insight|prediction)/i,
                /how.*at.?risk.*work/i,
                /how.*predict.*(drop.?out|failure)/i,
            ],
            handler: () =>
                of({
                    content: `\uD83E\uDDE0 **How to Use the Analytics & At-Risk Dashboard**\n\n**Accessing Analytics:**\n\n**Step 1:** Go to **Analytics \u2192 At-Risk Dashboard**.\n\n**Understanding the Score:**\n• Each student gets a **Composite Risk Score** (0-100) based on:\n  - GPA (below 2.0 = risk flag)\n  - Attendance (below 75% = risk flag)\n  - Fee debt (outstanding balance = risk flag)\n\n**Risk Levels:**\n• \uD83D\uDD34 **High** = Score > 70 (urgent intervention needed)\n• \uD83D\uDFE1 **Medium** = Score 40-70 (monitor closely)\n• \uD83D\uDFE2 **Low** = Score < 40 (doing well)\n\n**Taking Action:**\n• Click a student card to view their full breakdown.\n• Click **\"Send SMS\"** to notify the parent directly from this screen.\n\n> \uD83D\uDCA1 **Tip:** Run a weekly check on the At-Risk dashboard every Monday to catch problems early.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_roles',
            patterns: [
                /how.*(set|assign|configure|manage).*(role|permission|access|user)/i,
                /how.*user.*role/i,
                /who.*can.*access/i,
                /how.*restrict.*access/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDD10 **How to Manage User Roles & Permissions**\n\nThe system has **5 built-in roles** with different access levels:\n\n| Role | Access |
|---|---|
| **ADMIN** | Full access to all modules |
| **TEACHER** | Gradebook, Attendance, Timetable, Portal |
| **GUARDIAN** | Read-only portal (child's data only) |
| **BURSAR** | Finance & Fiscal modules |
| **LIBRARIAN** | Library module only |\n\n**Assigning Roles:**\n\n**Step 1:** Go to **Settings \u2192 User Management**.\n**Step 2:** Find the user and click **\"Edit Role\"**.\n**Step 3:** Select the appropriate role from the dropdown and click **Save**.\n\n> \uD83D\uDCA1 **Tip:** A staff member can have multiple roles (e.g., a teacher who is also a librarian). The system merges permissions automatically.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_alumni',
            patterns: [
                /how.*(manage|track|graduate|move).*(alumni|graduate|old student)/i,
                /how.*graduate.*student/i,
                /how.*alumni.*work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDF93 **How to Manage Alumni**\n\n**Graduating Students (End of Year):**\n\n**Step 1:** Go to **Students \u2192 Student List** and filter by graduating class.\n**Step 2:** Select all graduating students and click **\"Graduate Selected\"**.\n**Step 3:** Confirm the action. Their records are moved to the **Alumni** database with their academic history preserved.\n\n**Viewing Alumni:**\n\n**Step 1:** Go to **Students \u2192 Alumni** to search and view past graduates.\n**Step 2:** Alumni records include their full grade history, attendance, and contact details.\n\n**Alumni Outreach:**\n\n• Use **Communications \u2192 Campaigns** to send newsletters or announcements to alumni by targeting the *Alumni* audience group.\n\n> \uD83D\uDCA1 **Tip:** Graduating students are automatically removed from active class rolls but their data is never deleted.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_whatsapp',
            patterns: [
                /how.*(set up|configure|connect|integrate|use).*(whatsapp)/i,
                /how.*whatsapp.*work/i,
                /whatsapp.*integration/i,
                /how.*two.?way.*(message|chat)/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCF2 **How to Set Up WhatsApp Integration**\n\n**Step 1:** Go to **Settings \u2192 Integrations \u2192 WhatsApp**.\n\n**Step 2:** Enter your **Arkesel API Key** (or WhatsApp Business API credentials). Click **Save**.\n\n**Sending via WhatsApp:**\n\n**Step 1:** Go to **Communications \u2192 Campaigns \u2192 + New Campaign**.\n**Step 2:** Select **WhatsApp** as the channel.\n**Step 3:** Write your message (supports text, emojis, and links) and choose your audience.\n**Step 4:** Click **Send Now** or schedule it.\n\n**WhatsApp Inbox (Two-Way):**\n\n• Go to **Communications \u2192 WhatsApp Inbox** to view and reply to inbound messages from parents.\n• Conversations are threaded per contact for easy follow-up.\n\n> \uD83D\uDCA1 **Tip:** Use WhatsApp for fee reminders — open rates are 5x higher than SMS.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_extracurricular',
            patterns: [
                /how.*(add|create|manage|set up).*(club|sport|activit|extracurricular)/i,
                /how.*club.*work/i,
                /how.*sport.*team/i,
            ],
            handler: () =>
                of({
                    content: `\u26BD **How to Manage Extracurricular Activities**\n\n**Creating an Activity/Club:**\n\n**Step 1:** Go to **Academic \u2192 Extracurricular** and click **\"+ Add Activity\"**.\n**Step 2:** Enter the activity name (e.g., *Football Club*, *Drama Society*), category, and meeting schedule.\n**Step 3:** Assign a **Staff Supervisor** to oversee the activity. Click **Save**.\n\n**Enrolling Students:**\n\n**Step 1:** On the activity page, click **\"+ Add Member\"**.\n**Step 2:** Search for and select students to enroll. Click **Confirm**.\n\n**Viewing a Student's Activities:**\n\n• Go to **Students \u2192 Student Profile \u2192 Extracurricular** to see all clubs and activities a student belongs to.\n\n> \uD83D\uDCA1 **Tip:** Extracurricular participation is included in the student's portfolio and can be exported to their report card.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_notifications',
            patterns: [
                /how.*(set up|configure|enable|manage).*(notification|alert|reminder)/i,
                /how.*alert.*work/i,
                /how.*auto.*(notify|remind|message)/i,
                /how.*trigger.*sms/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDD14 **How to Configure Automated Notifications & Alerts**\n\nThe system can automatically send SMS/WhatsApp messages when certain events happen.\n\n**Available Automatic Triggers:**\n• \uD83D\uDCB8 **Fee payment received** \u2192 sends receipt to parent\n• \u26A0\uFE0F **Student marked absent** \u2192 notifies parent same day\n• \uD83D\uDCC5 **Upcoming fee due date** \u2192 reminder 3 days before\n• \uD83C\uDF82 **Student birthday** \u2192 auto-greeting to student/parent\n• \uD83D\uDCDA **Library book overdue** \u2192 notifies student and parent\n• \uD83D\uDCCA **Weekly newsletter** \u2192 auto-generated every Friday\n\n**Enabling / Disabling Alerts:**\n\n**Step 1:** Go to **Settings \u2192 Notifications**.\n**Step 2:** Toggle each alert type on or off.\n**Step 3:** Customize the message template for each trigger if needed.\n\n> \uD83D\uDCA1 **Tip:** Keep fee reminders enabled — they dramatically reduce the number of defaulters each term.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_multi_campus',
            patterns: [
                /how.*(set up|add|manage|configure).*(campus|branch|school)/i,
                /multi.campus/i,
                /how.*multiple.*(school|campus|branch)/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDFEB **How to Manage Multiple Campuses**\n\nThe system supports multi-campus operations from a single admin account.\n\n**Adding a Campus:**\n\n**Step 1:** Go to **Settings \u2192 Campus Management** and click **\"+ Add Campus\"**.\n**Step 2:** Enter the campus name, address, and contact details. Click **Save**.\n\n**Assigning Data to a Campus:**\n\n• When creating classes, students, or facilities, select the **Campus** from the dropdown.\n• Teachers and staff can be assigned to specific campuses.\n\n**Filtering by Campus:**\n\n• On most listing pages (Students, Teachers, Classes), use the **Campus** filter at the top to view data for a specific branch.\n\n**Campus-Specific Reports:**\n\n• Go to **Reports** and filter by **Campus** to generate campus-specific attendance, fee, or performance reports.\n\n> \uD83D\uDCA1 **Tip:** Super Admins can see all campuses. Campus-level admins only see their own campus data.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_meal_plans',
            patterns: [
                /how.*(set up|add|create|configure).*(meal|canteen|food|lunch)/i,
                /meal plan/i,
                /how.*canteen.*subscription/i,
                /how.*feeding/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDF7D\uFE0F **How to Set Up Canteen Meal Plans**\n\n**Creating a Meal Plan:**\n\n**Step 1:** Go to **Operations \u2192 Logistics \u2192 Canteen** and click **\"+ Add Meal Plan\"**.\n**Step 2:** Enter the plan name (e.g., *Full Boarding*, *Day Student*), description, and the term fee. Click **Save**.\n\n**Subscribing a Student:**\n\n**Step 1:** Go to the **Canteen** tab and click **\"+ Subscribe Student\"**.\n**Step 2:** Search for the student, select their meal plan, and confirm. The student's canteen subscription is now active for the term.\n\n**Cashless Canteen Payments:**\n\n• For daily POS checkouts, use **Finance \u2192 Digital Wallet \u2192 Canteen Purchase** to deduct from the student's pre-loaded wallet balance.\n\n> \uD83D\uDCA1 **Tip:** You can generate term canteen fees in bulk from **Finance \u2192 Dashboard \u2192 Generate Term Fees** after subscriptions are set.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_portfolio',
            patterns: [
                /how.*(add|create|build|manage).*(portfolio|achievement|award)/i,
                /how.*student.*portfolio/i,
                /how.*achievement.*work/i,
            ],
            handler: () =>
                of({
                    content: `\uD83C\uDFC5 **How to Build a Student Portfolio**\n\n**Adding Achievements:**\n\n**Step 1:** Go to **Students \u2192 Student Profile \u2192 Portfolio**.\n**Step 2:** Click **\"+ Add Achievement\"** and select the type:\n• *Academic* (e.g., Best Student, Science Olympiad Winner)\n• *Sports* (e.g., Regional Athletics Champion)\n• *Arts & Culture* (e.g., Drama Lead, Art Exhibition)\n• *Community Service*\n\n**Step 3:** Enter the title, date, description, and upload any supporting documents or certificates. Click **Save**.\n\n**Viewing the Portfolio:**\n\n• The full portfolio is visible on the student profile and can be exported as a PDF alongside the report card.\n• Parents can also view their child's portfolio from the **Parent Portal**.\n\n> \uD83D\uDCA1 **Tip:** A strong portfolio increases a student's chances of scholarships and secondary school placements.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_exams',
            patterns: [
                /how.*(set up|create|schedule|manage).*(exam|test|assessment|quiz)/i,
                /how.*exam.*schedule/i,
                /how.*exam.*timetable/i,
                /how.*end of term.*exam/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCDD **How to Set Up & Manage Exams**\n\n**Creating an Assessment in the Gradebook:**\n\n**Step 1:** Go to **Teacher Portal \u2192 Gradebook** and select a subject.\n**Step 2:** Click **\"+ Add Assessment\"**. Set the name (e.g., *End of Term Exam*), max score, and weight (e.g., 60% of final grade).\n**Step 3:** Enter student scores as they become available.\n\n**Exam Timetable:**\n\n**Step 1:** Go to **Academic \u2192 Timetable** and click **\"Exam Mode\"**.\n**Step 2:** Schedule each exam by selecting the subject, date, time, venue, and invigilator.\n**Step 3:** The exam timetable is automatically visible to teachers and students in their portals.\n\n**Publishing Results:**\n\n• Once all scores are entered and verified, go to **Academic \u2192 Results** and click **\"Publish Term Results\"** to make grades visible to parents via the portal.\n\n> \uD83D\uDCA1 **Tip:** Set assessment weights carefully — the system auto-calculates weighted averages and final GPAs.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_school_profile',
            patterns: [
                /how.*(set up|configure|update|change).*(school|profile|settings|branding|logo)/i,
                /how.*school.*name/i,
                /how.*system.*setting/i,
                /how.*configure.*system/i,
            ],
            handler: () =>
                of({
                    content: `\u2699\uFE0F **How to Configure School Profile & System Settings**\n\n**Setting Up Your School Profile:**\n\n**Step 1:** Go to **Settings \u2192 School Profile**.\n**Step 2:** Enter your school name, motto, address, phone number, and email.\n**Step 3:** Upload your **school logo** (used on report cards, bills, and communications).\n**Step 4:** Click **Save**.\n\n**Other Key Settings:**\n\n• **Academic Calendar** \u2192 Settings \u2192 Academic Periods\n• **Fee Configuration** \u2192 Finance \u2192 Configure Fees\n• **SMS/WhatsApp API** \u2192 Settings \u2192 Integrations\n• **Notification Triggers** \u2192 Settings \u2192 Notifications\n• **User Management & Roles** \u2192 Settings \u2192 Users\n• **Campus Management** \u2192 Settings \u2192 Campuses\n\n> \uD83D\uDCA1 **Tip:** Complete the school profile first — the name and logo appear on all printed documents and parent-facing communications.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_reset_password',
            patterns: [
                /how.*(reset|change|forgot).*(password)/i,
                /how.*help.*(login|access)/i,
                /password.*reset/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDD12 **How to Reset a User's Password**\n\n**Step 1:** Go to **Settings \u2192 User Management**.\n**Step 2:** Search for the user (Student, Teacher, or Parent).\n**Step 3:** Click the **three dots (\u22EE)** next to their name and select **\"Reset Password\"**.\n**Step 4:** A temporary password will be generated. You can either copy it or click **\"Send via SMS/Email\"** to send it directly to the user.\n\n> \uD83D\uDCA1 **Tip:** Users can also reset their own passwords from the login screen by clicking *"Forgot Password?"* if they have an active email or phone number on file.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_approve_leave',
            patterns: [
                /how.*(approve|reject|manage).*(leave|absence|time off)/i,
                /how.*leave.*request/i,
                /staff.*absence/i,
            ],
            handler: () =>
                of({
                    content: `\u2708\uFE0F **How to Manage Staff Leave Requests**\n\n**Step 1:** Go to **HR \u2192 Leave Management**.\n**Step 2:** Under the **Pending Requests** tab, review the leave type (Sick, Annual, Maternity, etc.) and dates requested.\n**Step 3:** Click **Approve** or **Reject**. \n**Step 4:** (Optional) Add a comment explaining your decision. The staff member will receive an instant notification.\n\n> \uD83D\uDCA1 **Tip:** Approved leave automatically reflects on the staff attendance register, preventing them from being marked as 'Absent without leave'.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_generate_id',
            patterns: [
                /how.*(generate|print|create).*(id|card|badge)/i,
                /student.*id/i,
                /staff.*badge/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCB3 **How to Generate ID Cards**\n\n**Step 1:** Go to **Students \u2192 Student List** (or **HR \u2192 Staff List** for teachers).\n**Step 2:** Select the checkboxes next to the names of the people who need ID cards.\n**Step 3:** Click the **\"Bulk Actions\"** dropdown at the top and select **\"Generate ID Cards\"**.\n**Step 4:** Choose your ID card template and click **Print**. The system generates a print-ready PDF with barcodes/QR codes.\n\n> \uD83D\uDCA1 **Tip:** ID cards feature a scannable QR code that can be used with the **Biometric Hub** or barcode scanners for automated daily attendance.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_grading_scale',
            patterns: [
                /how.*(set up|change|edit).*(grading|scale|system)/i,
                /how.*letter.*grade/i,
                /configure.*grades/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCCA **How to Configure Grading Scales**\n\n**Step 1:** Go to **Settings \u2192 Academic Settings \u2192 Grading Scales**.\n**Step 2:** Click **\"+ Add Scale\"** or edit an existing one (e.g., WASSCE, IGCSE, Standard GPA).\n**Step 3:** Define your grade boundaries. For example:\n• **A**: 80 - 100 (4.0 GPA, \"Excellent\")\n• **B**: 70 - 79 (3.0 GPA, \"Very Good\")\n**Step 4:** Assign this grading scale to specific scholastic levels (e.g., Senior High School uses WASSCE scale, Primary uses Standard).\n\n> \uD83D\uDCA1 **Tip:** Changing a grading scale automatically recalculates the GPA and letter grades for all past assessments tied to that scale.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_archive_data',
            patterns: [
                /how.*(archive|delete|remove|hide).*(old|past|data|student)/i,
                /year.*end.*rollover/i,
                /archive.*record/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCC2 **How to Archive Old Data (Year-End Rollover)**\n\nTo keep your dashboard fast and uncluttered, you should archive inactive records.\n\n**Step 1:** Go to **Settings \u2192 Data Management \u2192 Archive Utility**.\n**Step 2:** Select what you want to archive (e.g., *Past Academic Years*, *Graduated Students*, *Old Financial Records*).\n**Step 3:** Click **Archive Selected**. \n\n**Important:** Archived data is **never deleted**. It is just hidden from daily active views. You can always access it via the **Historical Data** tab in reports.\n\n> \uD83D\uDCA1 **Tip:** Do a full system backup before performing a major year-end rollover!`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_view_audit_logs',
            patterns: [
                /how.*(view|check|see).*(audit|log|activity|history)/i,
                /who.*changed.*(grade|fee|student)/i,
                /track.*activity/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDD0E **How to View Audit Logs**\n\nNeed to know who deleted a fee payment or changed a grade?\n\n**Step 1:** Go to **Settings \u2192 Audit Logs** (Only accessible by Super Admins).\n**Step 2:** Use the filters at the top to narrow down the search:\n• Filter by **User** (e.g., *Mr. John Doe*)\n• Filter by **Action** (e.g., *UPDATE_GRADE*, *DELETE_PAYMENT*)\n• Filter by **Date Range**.\n**Step 3:** The log will show you the exact timestamp, IP address, the old value, and the new value.\n\n> \uD83D\uDCA1 **Tip:** Every single database action (Create, Update, Delete) is permanently logged to ensure total institutional accountability.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_executive_dashboard',
            patterns: [
                /how.*(use|view|access).*(executive|dashboard|board|overview)/i,
                /school.*kpi/i,
                /management.*view/i,
            ],
            handler: () =>
                of({
                    content: `\uD83D\uDCBC **How to Use the Executive Dashboard**\n\nThe Executive Dashboard provides a high-level view for principals, directors, and school owners.\n\n**Step 1:** Go to **Admin \u2192 Executive Dashboard**.\n**Step 2:** The dashboard presents 4 critical quadrants:\n• **Financial Health:** Revenue vs Budget, Fee Deficit.\n• **Academic Performance:** Average GPA trends, Pass/Fail ratios.\n• **Operations:** Daily attendance rates, Staff turn-up.\n• **Growth:** Enrollment trends year-over-year.\n**Step 3:** Click **\"Export Board Report\"** at the top right to generate a PDF presentation for board meetings.\n\n> \uD83D\uDCA1 **Tip:** Executive KPIs update in real-time. You can filter the entire dashboard by Campus or Academic Term.`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'how_to_parent_teacher_conferences',
            patterns: [
                /how.*(set up|schedule|manage).*(parent.?teacher|conference|meeting)/i,
                /ptc|pta.*meeting/i,
                /book.*meeting/i,
            ],
            handler: () =>
                of({
                    content: `\uD83E\uDD1D **How to Schedule Parent-Teacher Conferences (PTC)**\n\n**Step 1:** Go to **Communications \u2192 Events & PTC** and click **\"+ New Conference\"**.\n**Step 2:** Set the date, time blocks (e.g., 15-minute slots), and participating teachers.\n**Step 3:** Click **Publish**. \n\n**Parent Booking:**\n• Parents will receive an automated notification.\n• They can log into the **Parent Portal**, view available slots for their child's teachers, and book a time.\n\n**Teacher View:**\n• Teachers see their booked schedule in their portal under **My Schedule**.\n\n> \uD83D\uDCA1 **Tip:** You can choose between 'In-Person' or 'Virtual' (generates a Google Meet link).`,
                    type: 'text' as const,
                }),
        },
        {
            name: 'help',
            patterns: [/help|what can you do|commands|what do you know/i],
            handler: () =>
                of({
                    content: `I can answer questions about your school data **and** guide you through common tasks.\n\n\uD83D\uDCCA **Live Data**\n• *"Show at-risk students"* • *"Who owes money?"*\n• *"Show house leaderboard"* • *"Overdue library books"*\n• *"Daily bills collection"* • *"Pending leave requests"*\n• *"Bus routes"* • *"Course demand"*\n\n\uD83D\uDCD6 **How-To Guides** (40 guides — ask anything!)\n• Academic Periods • Enrolling Students • Grades & Gradebook\n• Fee Structures • Bulk SMS & Campaigns • Payroll\n• Adding Teachers • House Points • Transport & Buses\n• Digital Wallet • Reports & Exports • Timetable\n• Library • Biometrics • Behavior Tracking\n• Health Records • Subjects & Curriculum • Facilities\n• Dashboard Layout • Analytics & At-Risk • User Roles\n• Alumni • WhatsApp Setup • Extracurriculars\n• Notifications • Multi-Campus • Meal Plans\n• Student Portfolios • Exam Management • School Profile\n• Reset Passwords • Approve Leave • Generate IDs\n• Grading Scales • Archive Data • Audit Logs\n• Executive Dashboard • Parent-Teacher Conferences`,
                    type: 'text' as const,
                }),
        },
    ];

    private greetings = [
        "Hello! I'm your school intelligence assistant. Ask me anything about student data, attendance, or financials — or ask me *how to* set up any feature!",
        "Hi there! I have access to live school data. I can also walk you through how to set up academic periods, fees, grades, and more. What would you like to know?",
        "Welcome! I can pull up student risk reports, KPIs, attendance stats, and guide you through common setup tasks. Type \"help\" to see everything I can do.",
    ];

    getGreeting(): ChatMessage {
        const idx = Math.floor(Math.random() * this.greetings.length);
        return {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: this.greetings[idx],
            timestamp: new Date(),
            type: 'text',
        };
    }

    processMessage(userText: string): Observable<ChatMessage> {
        const intent = this.intents.find(i => i.patterns.some(p => p.test(userText)));

        if (!intent) {
            return of({
                id: crypto.randomUUID(),
                role: 'assistant' as const,
                content: `I'm not sure how to answer that yet. Try asking about students, attendance, grades, or revenue. Type *"help"* to see what I can do.`,
                timestamp: new Date(),
                type: 'text' as const,
            });
        }

        return intent.handler().pipe(
            map(result => ({
                id: crypto.randomUUID(),
                role: 'assistant' as const,
                content: result.content,
                data: result.data,
                timestamp: new Date(),
                type: result.type || 'text',
            }))
        );
    }
}
