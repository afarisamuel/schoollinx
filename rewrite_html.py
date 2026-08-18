with open('frontend/src/app/features/dashboard/dashboard.component.html', 'r') as f:
    content = f.read()

# We need to preserve the wrapper div and just rewrite the contents to use the bento classes
# Let's completely replace the file content with the new structure.

html = """<div class="min-h-[calc(100vh-96px)] bg-primary text-text-primary font-sans overflow-y-auto overflow-x-hidden">
  
  <!-- Header Section -->
  <header class="px-4 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-0 relative z-10">
    <div class="animate-bento-in">
      <h1 class="text-3xl md:text-5xl font-extralight tracking-tight text-white mb-2">
        <span class="font-bold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">Hello,</span> {{ isAdmin() ? 'Administrator' : 'Teacher' }}
      </h1>
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full shadow-lg" 
              [class]="kpis()?.active_academic_year && kpis()?.active_academic_year !== 'None Active' ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-rose-400 shadow-rose-400/50'"></span>
        <p class="text-text-primary/50 font-bold tracking-[0.2em] text-xs uppercase">
          {{ kpis()?.active_academic_year || 'No Period Set' }}
        </p>
      </div>
    </div>
    
    <!-- Top KPIs -->
    <div class="flex flex-wrap items-center gap-4 animate-bento-in delay-2">
      <div class="kpi-pill">
        <span class="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Students</span>
        <span class="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{{ kpis()?.total_students || 0 }}</span>
      </div>
      <div class="kpi-pill">
        <span class="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Revenue</span>
        <span class="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">₵{{ kpis()?.total_revenue || 0 | number:'1.0-0' }}</span>
      </div>
      <div class="kpi-pill">
        <span class="text-[10px] font-bold text-text-primary/40 uppercase tracking-widest">Avg GPA</span>
        <span class="text-xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">{{ kpis()?.average_gpa || 0 | number:'1.1-1' }}</span>
      </div>
    </div>
  </header>

  <!-- Dashboard Controls -->
  <div class="px-4 md:px-8 pb-4 flex justify-between items-center z-10 relative animate-bento-in delay-3">
    <div class="flex items-center gap-3">
      <h2 class="text-xs font-bold tracking-widest text-text-primary/40 uppercase">Overview</h2>
      @if (isEditMode()) {
          <span class="text-[9px] font-bold text-indigo-400 tracking-widest uppercase px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 animate-pulse">Editing Layout</span>
      }
    </div>
    <div class="flex items-center gap-3">
      @if (isEditMode()) {
          <button (click)="resetLayout()" class="px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:scale-105 transition-all">
              Reset Layout
          </button>
      }
      <button (click)="toggleEditMode()" class="px-5 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all border flex items-center gap-2 hover:scale-105"
              [class]="isEditMode() ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-text-primary/80 hover:text-white hover:bg-white/10 border-white/10'">
          @if (isEditMode()) {
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Save Layout
          } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Customize
          }
      </button>
    </div>
  </div>

  <!-- Bento Grid Container -->
  <div class="px-4 md:px-8 pb-16">
    <div class="bento-grid animate-bento-in delay-4" [class.edit-mode]="isEditMode()" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="onWidgetDrop($event)">
      
      @for (widgetId of activeWidgets(); track widgetId) {
        <div cdkDrag [cdkDragDisabled]="!isEditMode()" class="relative group" [class.cursor-move]="isEditMode()">
            
            <!-- Drag Handle Overlay -->
            @if (isEditMode()) {
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="bg-indigo-500 text-white p-3 rounded-full shadow-xl shadow-indigo-500/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 9 3-3 3 3"/><path d="m9 22V2"/><path d="m19 9-3-3-3 3"/><path d="m15 22V2"/></svg>
                    </div>
                </div>
            }

            @switch (widgetId) {
                
                @case ('strategic-core') {
                    @if (isAdmin()) {
                        <a routerLink="/dashboard" class="bento-card bento-large theme-blue" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                                    </div>
                                    <div class="text-right">
                                        <span class="block text-4xl md:text-5xl font-light text-white tracking-tight">{{ kpis()?.total_students || 0 }}</span>
                                        <span class="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Total Enrolled</span>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-xl font-bold text-white mb-1">Strategic Core</h3>
                                    <p class="text-xs text-text-primary/60 font-medium">Registry & Alumni Hub</p>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('student-registry') {
                    <a routerLink="/students" class="bento-card theme-emerald" [class.pointer-events-none]="isEditMode()">
                        <div class="bento-content">
                            <div class="flex justify-between items-start mb-4">
                                <div class="bento-icon">
                                    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                            </div>
                            <div>
                                <span class="block text-2xl font-bold text-white">{{ kpis()?.total_students || 0 }}</span>
                                <h3 class="text-xs font-bold text-text-primary/60 uppercase tracking-widest mt-1">Registry</h3>
                            </div>
                        </div>
                    </a>
                }

                @case ('faculty-staff') {
                    @if (isAdmin()) {
                        <a routerLink="/teachers" class="bento-card theme-rose" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                    </div>
                                </div>
                                <div>
                                    <span class="block text-2xl font-bold text-white">{{ kpis()?.total_teachers || 0 }}</span>
                                    <h3 class="text-xs font-bold text-text-primary/60 uppercase tracking-widest mt-1">Faculty</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('academic-hub') {
                    @if (isAdmin()) {
                        <a routerLink="/hub/academic" class="bento-card bento-wide theme-purple" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                                    </div>
                                    <div class="text-right">
                                        <span class="block text-3xl font-light text-white">{{ kpis()?.average_gpa || 0 | number:'1.1-1' }}</span>
                                        <span class="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Avg GPA</span>
                                    </div>
                                </div>
                                <div class="mt-auto flex justify-between items-end">
                                    <div>
                                        <h3 class="text-xl font-bold text-white mb-1">Academic Hub</h3>
                                        <p class="text-xs text-text-primary/60 font-medium">Grading & Periods</p>
                                    </div>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('attendance') {
                    <a routerLink="/teachers/attendance" class="bento-card theme-emerald" [class.pointer-events-none]="isEditMode()">
                        <div class="bento-content">
                            <div class="flex justify-between items-start mb-4">
                                <div class="bento-icon">
                                    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13L9 13"/><path d="M16 17L9 17"/></svg>
                                </div>
                            </div>
                            <div>
                                <span class="block text-2xl font-bold text-white">{{ kpis()?.average_attendance || 0 | number:'1.0-0' }}%</span>
                                <h3 class="text-xs font-bold text-text-primary/60 uppercase tracking-widest mt-1">Attendance</h3>
                            </div>
                        </div>
                    </a>
                }

                @case ('classes') {
                    @if (isAdmin()) {
                        <a routerLink="/classes" class="bento-card theme-amber" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-lg font-bold text-white">Classes</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('operations-hub') {
                    @if (isAdmin()) {
                        <a routerLink="/hub/operations" class="bento-card bento-wide theme-rose" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-xl font-bold text-white mb-1">Operations Hub</h3>
                                    <p class="text-xs text-text-primary/60 font-medium">Welfare & Enrollment</p>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('financial-ledger') {
                    @if (isAdmin()) {
                        <a routerLink="/fiscal" class="bento-card bento-wide theme-cyan" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                                    </div>
                                    <div class="text-right">
                                        <span class="block text-3xl font-light text-white">₵{{ kpis()?.total_revenue || 0 | number:'1.0-0' }}</span>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-xl font-bold text-white mb-1">Financial Ledger</h3>
                                    <p class="text-xs text-text-primary/60 font-medium">Fees, Budgets & Claims</p>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('at-risk') {
                    @if (isAdmin()) {
                        <a routerLink="/analytics/at-risk" class="bento-card theme-rose border-rose-500/30 shadow-[inset_0_0_20px_rgba(244,63,94,0.1)]" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon !bg-rose-500/20 !text-rose-400">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    </div>
                                </div>
                                <div>
                                    <span class="block text-2xl font-bold text-white animate-pulse">{{ atRiskStudents() ? atRiskStudents().length : 0 }}</span>
                                    <h3 class="text-xs font-bold text-rose-400 uppercase tracking-widest mt-1">At Risk</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('intelligence-hub') {
                    @if (isAdmin()) {
                        <a routerLink="/analytics" class="bento-card bento-large theme-blue" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/><path d="M2 20h20"/></svg>
                                    </div>
                                    <div class="text-right">
                                        <div class="mb-3">
                                            <span class="block text-2xl font-light text-white">{{ retentionRisks() ? retentionRisks().length : 0 }}</span>
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-text-primary/50">Risks</span>
                                        </div>
                                        <div>
                                            <span class="block text-2xl font-light text-white">{{ courseDemands() ? courseDemands().length : 0 }}</span>
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-text-primary/50">Flux</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-xl font-bold text-white mb-1">Intelligence Hub</h3>
                                    <p class="text-xs text-text-primary/60 font-medium">Predictive Analytics & AI</p>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('messages') {
                    @if (isAdmin()) {
                        <a routerLink="/communications/messages" class="bento-card theme-fuchsia" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-lg font-bold text-white">Messages</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('library') {
                    @if (isAdmin()) {
                        <a routerLink="/library" class="bento-card theme-purple" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                                    </div>
                                </div>
                                <div>
                                    <span class="block text-2xl font-bold text-white">{{ kpis()?.library_loans || 0 }}</span>
                                    <h3 class="text-xs font-bold text-text-primary/60 uppercase tracking-widest mt-1">Active Loans</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('clubs') {
                    @if (isAdmin()) {
                        <a routerLink="/clubs" class="bento-card theme-emerald" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-lg font-bold text-white">Clubs</h3>
                                </div>
                            </div>
                        </a>
                    }
                }
                
                @case ('connectivity-hub') {
                    @if (isAdmin()) {
                        <a routerLink="/hub/connectivity" class="bento-card bento-wide theme-cyan" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-xl font-bold text-white mb-1">Connectivity Hub</h3>
                                    <p class="text-xs text-text-primary/60 font-medium">Events & Calendar</p>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('biometrics') {
                    @if (isAdmin()) {
                        <a routerLink="/biometrics" class="bento-card theme-blue" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10"/><path d="M12 22C6.477 22 2 17.523 2 12"/><path d="M22 12c0 5.523-4.477 10-10 10"/><path d="M12 7a5 5 0 1 0 5 5"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-lg font-bold text-white">Biometrics</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('hr') {
                    @if (isAdmin()) {
                        <a routerLink="/hr" class="bento-card theme-amber" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-lg font-bold text-white">HR</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

                @case ('executive-dashboard') {
                    @if (isAdmin()) {
                        <a routerLink="/executive-dashboard" class="bento-card theme-rose" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-lg font-bold text-white">Executive</h3>
                                </div>
                            </div>
                        </a>
                    }
                }
                
                @case ('teacher-portal') {
                    @if (isTeacher()) {
                        <a routerLink="/teachers/portal" class="bento-card bento-wide theme-blue" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start">
                                    <div class="bento-icon">
                                        <svg width="28" height="28" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <h3 class="text-xl font-bold text-white mb-1">Teacher Gradebook</h3>
                                    <p class="text-xs text-text-primary/60 font-medium">Classes & Grading</p>
                                </div>
                            </div>
                        </a>
                    }
                }
                
                @case ('daily-collection') {
                    @if (isTeacher() && canCollectFees()) {
                        <a routerLink="/teachers/daily-collection" class="bento-card theme-emerald" [class.pointer-events-none]="isEditMode()">
                            <div class="bento-content">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="bento-icon">
                                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                    </div>
                                </div>
                                <div class="mt-auto">
                                    <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 block">Authorized</span>
                                    <h3 class="text-lg font-bold text-white">Collections</h3>
                                </div>
                            </div>
                        </a>
                    }
                }

            }
        </div>
      }
    </div>
  </div>
</div>
"""

with open('frontend/src/app/features/dashboard/dashboard.component.html', 'w') as f:
    f.write(html)
