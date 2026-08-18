import re

with open('frontend/src/app/features/dashboard/dashboard.component.html', 'r') as f:
    content = f.read()

# We want to replace everything from <div class="metro-grid"> to the end of that div (which is just before </div></div>)
start_marker = '<div class="metro-grid">'
end_marker = '</div>\n</div>'

start_idx = content.find(start_marker)
# Find the second to last </div>
end_idx = content.rfind(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_grid = """<div class="mb-4 flex justify-between items-center px-2">
      <h2 class="text-sm font-bold tracking-widest text-text-primary/50 uppercase">Dashboard Layout</h2>
      <button (click)="toggleEditMode()" class="px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all border"
              [class]="isEditMode() ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-bg-tertiary text-text-muted hover:text-text-primary border-border-primary'">
          {{ isEditMode() ? 'Done Editing' : 'Edit Dashboard' }}
      </button>
  </div>
  
  <div class="metro-grid" [class.edit-mode]="isEditMode()" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="onWidgetDrop($event)">
      @for (widgetId of activeWidgets(); track widgetId) {
          <div cdkDrag [cdkDragDisabled]="!isEditMode()" class="relative group" [class.cursor-move]="isEditMode()">
              @if (isEditMode()) {
                  <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl border-2 border-indigo-500 border-dashed opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </div>
              }

              @switch (widgetId) {
                  @case ('strategic-core') {
                      @if (isAdmin()) {
                          <a routerLink="/dashboard" class="metro-tile tile-large bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                              <div class="flex justify-between items-start">
                                  <svg class="tile-icon w-10 h-10 text-[#0078D7]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                                  <span class="text-2xl md:text-3xl font-extralight">{{ kpis()?.total_students || 0 }}</span>
                              </div>
                              <div>
                                  <h2 class="text-xl font-semibold leading-tight">Strategic Core</h2>
                                  <p class="text-text-primary/60 text-[10px] font-bold tracking-widest uppercase mt-1">Dashboard · Registry · Alumni</p>
                              </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('student-registry') {
                      <a routerLink="/students" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                          <div class="tile-content">
                              <svg class="tile-icon w-8 h-8 text-[#107C10]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              <div>
                                  <span class="text-2xl font-bold">{{ kpis()?.total_students || 0 }}</span>
                                  <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Student Registry</p>
                              </div>
                          </div>
                      </a>
                  }
                  @case ('faculty-staff') {
                      @if (isAdmin()) {
                          <a routerLink="/teachers" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#D83B01]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                  <div>
                                      <span class="text-2xl font-bold">{{ kpis()?.total_teachers || 0 }}</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Faculty Staff</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('academic-hub') {
                      @if (isAdmin()) {
                          <a routerLink="/hub/academic" class="metro-tile tile-wide bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                              <div class="flex justify-between items-start">
                                  <svg class="tile-icon w-9 h-9 text-[#5C2D91]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                  <div class="flex gap-4 text-right">
                                  <div>
                                      <span class="text-xl font-light">{{ kpis()?.average_gpa || 0 | number:'1.1-1' }}</span>
                                      <p class="text-[8px] font-bold text-text-primary/50 uppercase tracking-wider">Avg GPA</p>
                                  </div>
                                  </div>
                              </div>
                              <div>
                                  <h2 class="text-lg font-semibold">Academic Hub</h2>
                                  <p class="text-text-primary/60 text-[10px] font-bold tracking-widest uppercase mt-1">Grading · Attendance · Periods</p>
                              </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('attendance') {
                      <a routerLink="/teachers/attendance" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                          <div class="tile-content">
                              <svg class="tile-icon w-8 h-8 text-[#00B294]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13L9 13"/><path d="M16 17L9 17"/></svg>
                              <div>
                                  <span class="text-xl font-bold">{{ kpis()?.average_attendance || 0 | number:'1.0-0' }}%</span>
                                  <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Attendance</p>
                              </div>
                          </div>
                      </a>
                  }
                  @case ('classes') {
                      @if (isAdmin()) {
                          <a routerLink="/classes" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#FFB900]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                                  <div>
                                      <span class="text-xl font-bold">Classes</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Management</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('biometrics') {
                      @if (isAdmin()) {
                          <a routerLink="/biometrics" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#0078D7]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10"/><path d="M12 22C6.477 22 2 17.523 2 12"/><path d="M22 12c0 5.523-4.477 10-10 10"/><path d="M12 7a5 5 0 1 0 5 5"/></svg>
                                  <div>
                                      <span class="text-xl font-bold">Biometrics</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Hardware Integration</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('hr') {
                      @if (isAdmin()) {
                          <a routerLink="/hr" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#D83B01]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                  <div>
                                      <span class="text-xl font-bold">HR & Payroll</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Staff Management</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('operations-hub') {
                      @if (isAdmin()) {
                          <a routerLink="/hub/operations" class="metro-tile tile-wide bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                              <div class="flex justify-between items-start">
                                  <svg class="tile-icon w-9 h-9 text-[#E81123]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                  <span class="text-2xl md:text-2xl font-extralight">{{ atRiskStudents() ? atRiskStudents().length : 0 }}</span>
                              </div>
                              <div>
                                  <h2 class="text-lg font-semibold">Operations Hub</h2>
                                  <p class="text-text-primary/60 text-[10px] font-bold tracking-widest uppercase mt-1">Welfare · Logistics · Enrollment</p>
                              </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('financial-ledger') {
                      @if (isAdmin()) {
                          <a routerLink="/fiscal" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#008272]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                                  <div>
                                      <span class="text-xl font-bold">₵{{ kpis()?.total_revenue || 0 | number:'1.0-0' }}</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Financial Ledger</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('at-risk') {
                      @if (isAdmin()) {
                          <a routerLink="/students" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#B4009E]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                  <div>
                                      <span class="text-xs font-bold live-counter">{{ atRiskStudents() ? atRiskStudents().length : 0 }}</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">At Risk</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('intelligence-hub') {
                      @if (isAdmin()) {
                          <a routerLink="/analytics" class="metro-tile tile-wide bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                              <div class="flex justify-between items-start">
                                  <svg class="tile-icon w-9 h-9 text-[#00188F]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/><path d="M2 20h20"/></svg>
                                  <div class="flex gap-4">
                                  <div class="text-right">
                                      <span class="text-xl font-light">{{ retentionRisks() ? retentionRisks().length : 0 }}</span>
                                      <p class="text-[8px] font-bold text-text-primary/50 uppercase tracking-wider">Risks</p>
                                  </div>
                                  <div class="text-right">
                                      <span class="text-xl font-light">{{ courseDemands() ? courseDemands().length : 0 }}</span>
                                      <p class="text-[8px] font-bold text-text-primary/50 uppercase tracking-wider">Flux</p>
                                  </div>
                                  </div>
                              </div>
                              <div>
                                  <h2 class="text-lg font-semibold">Intelligence Hub</h2>
                                  <p class="text-text-primary/60 text-[10px] font-bold tracking-widest uppercase mt-1">Analytics · Audit · Insights</p>
                              </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('executive-dashboard') {
                      @if (isAdmin()) {
                          <a routerLink="/executive-dashboard" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#D83B01]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                  <div>
                                      <span class="text-xl font-bold">Executive</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Dashboard</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('connectivity-hub') {
                      @if (isAdmin()) {
                          <a routerLink="/hub/connectivity" class="metro-tile tile-wide bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                              <div class="flex justify-between items-start">
                                  <svg class="tile-icon w-9 h-9 text-[#00A4EF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                  <div class="text-right">
                                  <span class="text-xl font-light">{{ kpis()?.library_loans || 0 }}</span>
                                  <p class="text-[8px] font-bold text-text-primary/50 uppercase tracking-wider">Active Loans</p>
                                  </div>
                              </div>
                              <div>
                                  <h2 class="text-lg font-semibold">Connectivity Hub</h2>
                                  <p class="text-text-primary/60 text-[10px] font-bold tracking-widest uppercase mt-1">Messaging · Library · Clubs</p>
                              </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('library') {
                      @if (isAdmin()) {
                          <a routerLink="/library" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#68217A]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                                  <div>
                                      <span class="text-2xl font-bold">{{ kpis()?.library_loans || 0 }}</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider">Library</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('clubs') {
                      @if (isAdmin()) {
                          <a routerLink="/clubs" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#008A00]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                  <div>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider mt-4">Societies & Clubs</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('messages') {
                      @if (isAdmin()) {
                          <a routerLink="/communications/messages" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#4C4A48]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                  <div>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider mt-4">Messages</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('teacher-portal') {
                      @if (isTeacher()) {
                          <a routerLink="/teachers/portal" class="metro-tile tile-wide bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                              <div class="flex justify-between items-start">
                                  <svg class="tile-icon w-9 h-9 text-[#2B5797]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                              </div>
                              <div>
                                  <h2 class="text-lg font-semibold">Teacher Gradebook</h2>
                                  <p class="text-text-primary/60 text-[10px] font-bold tracking-widest uppercase mt-1">Classes · Grading</p>
                              </div>
                              </div>
                          </a>
                      }
                  }
                  @case ('daily-collection') {
                      @if (isTeacher() && canCollectFees()) {
                          <a routerLink="/teachers/daily-collection" class="metro-tile bg-bg-secondary" [class.pointer-events-none]="isEditMode()">
                              <div class="tile-content">
                                  <svg class="tile-icon w-8 h-8 text-[#008272]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                  <div>
                                      <span class="text-xs font-bold text-emerald-200">Authorized</span>
                                      <p class="text-[10px] font-bold text-text-primary/70 uppercase tracking-wider mt-1">Daily Collections</p>
                                  </div>
                              </div>
                          </a>
                      }
                  }
              }
          </div>
      }
  </div>"""

new_content = content[:start_idx] + new_grid + content[end_idx + len(end_marker):]

with open('frontend/src/app/features/dashboard/dashboard.component.html', 'w') as f:
    f.write(new_content)
