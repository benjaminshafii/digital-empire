# Execution Plan: Nov 2 - Iteration A
# Corgina iOS App - 4 Parallel Tasks

**Created:** November 2, 2025  
**Status:** Ready for Execution  
**Target Completion:** 2-3 working days  
**Worktree Strategy:** 3 parallel branches

---

## Executive Summary

This execution plan organizes 4 documented tasks into an optimal parallel implementation strategy using git worktrees. The tasks have been analyzed for dependencies, file conflicts, and complexity to maximize parallel development while avoiding merge conflicts.

**Total Estimated Time:** 13-16 hours  
**Parallelization Strategy:** 3 worktrees running simultaneously  
**Risk Level:** Low-Medium (minimal file overlaps)

---

## Task Analysis

### Task 1: Remove Broken "Picture Log Food" from Settings
- **File:** `MoreView.swift` (lines 65-73)
- **Complexity:** Very Low (simple deletion)
- **Time Estimate:** 15 minutes
- **Dependencies:** None
- **Risk:** Very Low (isolated change)
- **Files Modified:** 1 file, 9 lines deleted

### Task 2: Floating Action Button Pill
- **Primary Files:** New `FloatingActionPill.swift`, `MainTabView.swift`
- **Secondary Files:** `DashboardView.swift` (potential refactor), `ExpandableVoiceNavbar.swift` (reference)
- **Complexity:** High (new component + integration + state management)
- **Time Estimate:** 6-8 hours
- **Dependencies:** Managers (VoiceLogManager, PhotoFoodLogManager, LogsManager)
- **Risk:** Medium (complex state interactions)
- **Files Created:** 1-2 new files
- **Files Modified:** 1-2 existing files

### Task 3: Extended Pregnancy Fun Facts
- **File:** `PregnancyFunFact.swift`
- **Complexity:** Low (data addition + enum expansion)
- **Time Estimate:** 3 hours
- **Dependencies:** `PregnancyDataManager` (read-only)
- **Risk:** Very Low (mostly data entry)
- **Files Modified:** 1 file (data model + 45 new facts)

### Task 4: Calorie Tracking Enhancements
- **Primary Files:** `WeeklyCalorieTrackerCard.swift`, `PregnancyDataManager.swift`, `NotificationManager.swift`, `LogsManager.swift`
- **Secondary Files:** New `DailyCalorieTrackerCard.swift`, `DashboardView.swift`
- **Complexity:** High (multiple file changes + new logic + UI)
- **Time Estimate:** 6-8 hours
- **Dependencies:** PregnancyDataManager, NotificationManager, LogsManager
- **Risk:** Medium-High (touches many core files)
- **Files Created:** 1 new file
- **Files Modified:** 4-5 existing files

---

## Dependency & Conflict Analysis

### File Modification Matrix

| File | Task 1 | Task 2 | Task 3 | Task 4 |
|------|--------|--------|--------|--------|
| **MoreView.swift** | ✅ DELETE | - | - | - |
| **MainTabView.swift** | - | ✅ MODIFY | - | - |
| **DashboardView.swift** | - | 🟡 OPTIONAL | - | 🟡 OPTIONAL |
| **PregnancyFunFact.swift** | - | - | ✅ MODIFY | - |
| **PregnancyDataManager.swift** | - | - | 📖 READ | ✅ MODIFY |
| **NotificationManager.swift** | - | - | - | ✅ MODIFY |
| **LogsManager.swift** | - | - | - | ✅ MODIFY |
| **WeeklyCalorieTrackerCard.swift** | - | - | - | ✅ MODIFY |
| **FloatingActionPill.swift** | - | ✅ CREATE | - | - |
| **DailyCalorieTrackerCard.swift** | - | - | - | ✅ CREATE |

**Legend:**
- ✅ = Direct modification required
- 🟡 = Optional/minor change
- 📖 = Read-only dependency
- `-` = No interaction

### Conflict Assessment

**No Direct Conflicts:**
- Tasks 1, 2, 3, 4 modify completely different files
- DashboardView overlap is optional and minimal (adding card references)
- PregnancyDataManager: Task 3 reads only, Task 4 adds new methods (no conflict)

**Potential Merge Challenges:**
- **DashboardView.swift**: Both Task 2 (photo state management) and Task 4 (add calorie card) may touch this file
  - **Severity:** LOW - Different sections of file
  - **Resolution:** Task 4's changes are additive (new card), Task 2's are refactoring
- **PregnancyDataManager.swift**: Task 4 adds new `CalorieRange` methods
  - **Severity:** NONE - Pure addition, no conflicts

**Critical Path:**
- No blocking dependencies between tasks
- All tasks can proceed in parallel

---

## Worktree Strategy

### Worktree 1: `feature/nov2-quick-fixes`
**Tasks:** Task 1 (Settings cleanup)  
**Branch Name:** `feature/nov2-quick-fixes`  
**Base:** `master`  
**Estimated Time:** 15 minutes  
**Priority:** HIGH (quick win, merge first)

**Rationale:**
- Task 1 is trivial and fast
- Merge immediately to unblock main branch
- No conflicts with other work
- Can be completed and merged while other tasks are in progress

**Files Changed:**
- ✅ MoreView.swift (DELETE lines 65-73)

**Commands:**
```bash
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder
git worktree add ../HydrationReminder-quick-fixes -b feature/nov2-quick-fixes master
```

---

### Worktree 2: `feature/nov2-fab-pill-tracking`
**Tasks:** Task 2 (Floating Action Button) + Task 3 (Pregnancy Fun Facts)  
**Branch Name:** `feature/nov2-fab-pill-tracking`  
**Base:** `master`  
**Estimated Time:** 9-11 hours  
**Priority:** MEDIUM (UI/UX enhancements)

**Rationale:**
- Task 2 and Task 3 are completely independent of each other
- NO file conflicts between them
- Group them to balance workload across worktrees
- Task 3 is quick (3 hrs) and can be done while Task 2 is being tested
- Both are frontend-focused with no backend complexity

**Implementation Order:**
1. **Start with Task 3** (3 hours) - Quick data entry task
   - Extend `PregnancyFunFact.swift` enum
   - Add 45 new facts
   - Test rotation logic
2. **Then Task 2** (6-8 hours) - Complex UI work
   - Create `FloatingActionPill.swift`
   - Integrate into `MainTabView.swift`
   - Photo logging state management
   - Testing and polish

**Files Changed:**
- ✅ PregnancyFunFact.swift (Task 3)
- ✅ FloatingActionPill.swift (Task 2 - NEW)
- ✅ MainTabView.swift (Task 2)
- 🟡 DashboardView.swift (Task 2 - optional refactor)

**Commands:**
```bash
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder
git worktree add ../HydrationReminder-fab-pill-tracking -b feature/nov2-fab-pill-tracking master
```

---

### Worktree 3: `feature/nov2-calorie-enhancements`
**Tasks:** Task 4 (Calorie Tracking Enhancements)  
**Branch Name:** `feature/nov2-calorie-enhancements`  
**Base:** `master`  
**Estimated Time:** 6-8 hours  
**Priority:** MEDIUM-HIGH (core feature enhancement)

**Rationale:**
- Task 4 is complex and touches multiple core files
- Needs focused attention due to state management complexity
- Completely independent from other tasks (no file conflicts)
- Touches critical managers (NotificationManager, LogsManager, PregnancyDataManager)

**Implementation Phases:**
1. **Phase 1:** PregnancyDataManager extensions (CalorieRange logic)
2. **Phase 2:** DailyCalorieTrackerCard UI component
3. **Phase 3:** WeeklyCalorieTrackerCard enhancements
4. **Phase 4:** NotificationManager calorie reminders
5. **Phase 5:** Integration testing

**Files Changed:**
- ✅ PregnancyDataManager.swift
- ✅ NotificationManager.swift
- ✅ LogsManager.swift
- ✅ WeeklyCalorieTrackerCard.swift
- ✅ DailyCalorieTrackerCard.swift (NEW)
- 🟡 DashboardView.swift (add card reference)

**Commands:**
```bash
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder
git worktree add ../HydrationReminder-calorie-enhancements -b feature/nov2-calorie-enhancements master
```

---

## Execution Timeline

### Day 1 (8 hours)
**Morning (4 hours):**
- ✅ **Worktree 1** (Agent A): Complete Task 1 (15 min) → Test → Merge to master
- 🔄 **Worktree 2** (Agent B): Begin Task 3 (Pregnancy Fun Facts) - 3 hours
- 🔄 **Worktree 3** (Agent C): Begin Task 4 Phase 1 & 2 (CalorieRange + DailyCard) - 4 hours

**Afternoon (4 hours):**
- ✅ **Worktree 2** (Agent B): Complete Task 3 → Begin Task 2 (FloatingActionPill component creation)
- 🔄 **Worktree 3** (Agent C): Continue Task 4 Phase 3 & 4 (WeeklyCard + Notifications)

**End of Day 1:**
- Task 1: ✅ Merged to master
- Task 3: ✅ Complete, pending merge
- Task 2: 🔄 50% complete (component created, integration pending)
- Task 4: 🔄 60% complete (data layer + DailyCard done, notifications pending)

---

### Day 2 (8 hours)
**Morning (4 hours):**
- 🔄 **Worktree 2** (Agent B): Task 2 integration (MainTabView, photo logic)
- 🔄 **Worktree 3** (Agent C): Task 4 Phase 5 (integration testing, bug fixes)

**Afternoon (4 hours):**
- 🔄 **Worktree 2** (Agent B): Task 2 testing, polish, animations
- ✅ **Worktree 3** (Agent C): Complete Task 4 → Test → Ready for merge

**End of Day 2:**
- Tasks 1 & 3: ✅ Merged to master
- Task 4: ✅ Complete, pending merge
- Task 2: 🔄 90% complete (testing phase)

---

### Day 3 (2 hours)
**Morning (2 hours):**
- ✅ **Worktree 2** (Agent B): Complete Task 2 → Test → Ready for merge
- 🔀 **Final Integration**: Merge Worktree 2 & 3 to master
- ✅ **Full App Testing**: Ensure all features work together

**End of Day 3:**
- All tasks: ✅ Complete and merged
- Iteration A: ✅ Shipped

---

## Integration & Merge Strategy

### Merge Order (Critical)

**1. Merge Worktree 1 FIRST (Day 1 Morning)**
```bash
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder
git checkout master
git merge --no-ff feature/nov2-quick-fixes
git push origin master
```

**Rationale:** Quick fix, no dependencies, creates clean baseline

---

**2. Merge Worktree 2 (Task 3 portion) - Day 1 Evening**
```bash
# If Task 3 is complete before Task 2, cherry-pick those commits
git checkout feature/nov2-fab-pill-tracking
git log --oneline # Identify Task 3 commits

git checkout master
git cherry-pick <task3-commit-hashes>
git push origin master

# Rebase Worktree 2 branch on new master
git checkout feature/nov2-fab-pill-tracking
git rebase master
```

**Rationale:** Task 3 is independent and can be merged early

---

**3. Merge Worktree 3 (Day 2 Evening)**
```bash
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder
git checkout master
git merge --no-ff feature/nov2-calorie-enhancements
```

**Conflict Resolution (if any):**
- **DashboardView.swift:** Accept both changes (Task 4 adds calorie card)
- **PregnancyDataManager.swift:** No conflicts expected (pure additions)

**Post-Merge Testing:**
- Run full test suite
- Test calorie tracking across all trimesters
- Verify notifications fire correctly

---

**4. Merge Worktree 2 (Task 2 portion) - Day 3 Morning**
```bash
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder
git checkout master
git merge --no-ff feature/nov2-fab-pill-tracking
```

**Conflict Resolution (if any):**
- **MainTabView.swift:** No conflicts expected (Task 2 only touches FAB overlay)
- **DashboardView.swift:** May need to merge photoLogManager state management
  - Resolution: Keep both sets of changes, they're in different sections

**Post-Merge Testing:**
- Test FAB mic and camera buttons
- Verify voice recording still works
- Test photo logging from FAB
- Verify pregnancy fun facts rotate correctly

---

### Merge Conflict Prevention

**Best Practices:**
1. **Frequent Rebasing:** Each worktree should rebase on master after Worktree 1 merges
2. **Communication:** Coordinate DashboardView changes
3. **Atomic Commits:** Keep commits small and focused
4. **Clear Commit Messages:** Prefix with task number (e.g., "Task 2: Add FloatingActionPill component")

**Pre-Merge Checklist for Each Branch:**
- [ ] All files compile without errors
- [ ] No SwiftLint warnings introduced
- [ ] All relevant tests pass
- [ ] Manual testing completed
- [ ] No debug print statements left
- [ ] Documentation updated (if needed)

---

## Testing Strategy

### Per-Worktree Testing

**Worktree 1 (Task 1):**
- [ ] MoreView loads without "Food Photo Log" option
- [ ] Other Health Tracking options still visible
- [ ] DashboardView photo logging still works

**Worktree 2 (Tasks 2 & 3):**
- [ ] FloatingActionPill renders correctly
- [ ] Mic button starts/stops recording
- [ ] Camera button opens photo options
- [ ] Photo capture and library selection work
- [ ] Pregnancy fun facts show new content
- [ ] Fact rotation includes new categories
- [ ] Trimester-specific facts appear correctly

**Worktree 3 (Task 4):**
- [ ] DailyCalorieTrackerCard displays current intake
- [ ] Trimester-specific ranges shown correctly
- [ ] WeeklyCalorieTrackerCard shows range bands
- [ ] Range transitions correctly at trimester boundaries
- [ ] Low calorie notification fires at 6 PM
- [ ] High calorie notice fires when threshold exceeded
- [ ] Settings toggle enables/disables reminders

### Integration Testing (Post-Merge)

**Full App Smoke Test:**
1. Launch app → DashboardView loads
2. Verify all new UI elements present:
   - FAB pill (Task 2)
   - DailyCalorieTrackerCard (Task 4)
   - Enhanced WeeklyCalorieTrackerCard (Task 4)
3. Navigate to More view → "Food Photo Log" should be gone (Task 1)
4. Test FAB mic button → voice recording works
5. Test FAB camera button → photo logging works
6. Log food → calorie tracking updates
7. Rotate pregnancy fun fact → new facts appear (Task 3)
8. Change pregnancy week → calorie range updates (Task 4)

**Regression Testing:**
- [ ] Existing voice logging from other UI elements still works
- [ ] Photo logging from DashboardView food card still works
- [ ] All existing dashboard cards render
- [ ] Tab navigation works smoothly
- [ ] Notifications don't conflict

---

## Risk Mitigation

### Risk 1: DashboardView Merge Conflicts
**Likelihood:** Medium  
**Impact:** Low

**Mitigation:**
- Task 2's DashboardView changes are optional (can skip refactor)
- Task 4's changes are additive (new card in ScrollView)
- Changes are in different sections of the file

**Resolution Strategy:**
1. Accept both changes
2. Manually verify ScrollView contains both new cards
3. Test that state management doesn't conflict

---

### Risk 2: Complex State Management in Task 2
**Likelihood:** Medium  
**Impact:** Medium

**Mitigation:**
- Follow existing patterns from DashboardView
- Extensive testing of state transitions
- Add debug logging for troubleshooting
- Implement debouncing to prevent rapid-fire issues

**Fallback:**
- If photoLogManager state is too complex, keep photo logging only in DashboardView
- FAB camera button can navigate to DashboardView instead of handling inline

---

### Risk 3: Notification Timing Issues (Task 4)
**Likelihood:** Medium  
**Impact:** Low

**Mitigation:**
- Test notification triggers in multiple scenarios
- Implement rate limiting (max 2 notifications/day)
- Add user preference toggle
- Use background tasks carefully (iOS restrictions)

**Fallback:**
- Simplify to check-on-open instead of scheduled time
- Show in-app banner instead of system notification

---

### Risk 4: Pregnancy Week Calculation Edge Cases (Task 4)
**Likelihood:** Low  
**Impact:** Medium

**Mitigation:**
- Add comprehensive unit tests for trimester transitions
- Test with various LMP dates
- Handle nil/missing pregnancy data gracefully
- Default to safe baseline when data unavailable

---

## Git Worktree Commands Reference

### Setup All Worktrees
```bash
# Navigate to main project
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder

# Create Worktree 1 (Quick Fixes)
git worktree add ../HydrationReminder-quick-fixes -b feature/nov2-quick-fixes master

# Create Worktree 2 (FAB + Fun Facts)
git worktree add ../HydrationReminder-fab-pill-tracking -b feature/nov2-fab-pill-tracking master

# Create Worktree 3 (Calorie Enhancements)
git worktree add ../HydrationReminder-calorie-enhancements -b feature/nov2-calorie-enhancements master

# Verify worktrees
git worktree list
```

### Working in Worktrees
```bash
# Worktree 1
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder-quick-fixes
# Make changes, commit, push

# Worktree 2
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder-fab-pill-tracking
# Make changes, commit, push

# Worktree 3
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder-calorie-enhancements
# Make changes, commit, push
```

### Syncing with Master (After Worktree 1 Merges)
```bash
# In Worktree 2
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder-fab-pill-tracking
git fetch origin
git rebase origin/master

# In Worktree 3
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder-calorie-enhancements
git fetch origin
git rebase origin/master
```

### Cleanup After Merging
```bash
# After all branches merged
cd /Users/benjaminshafii/git/personal/pregnancy/HydrationReminder

# Remove worktrees
git worktree remove ../HydrationReminder-quick-fixes
git worktree remove ../HydrationReminder-fab-pill-tracking
git worktree remove ../HydrationReminder-calorie-enhancements

# Delete remote branches (optional)
git push origin --delete feature/nov2-quick-fixes
git push origin --delete feature/nov2-fab-pill-tracking
git push origin --delete feature/nov2-calorie-enhancements

# Delete local branches
git branch -d feature/nov2-quick-fixes
git branch -d feature/nov2-fab-pill-tracking
git branch -d feature/nov2-calorie-enhancements
```

---

## Agent Assignment Recommendations

### Agent A: Worktree 1 (Quick Fixes)
**Skills Required:** Basic SwiftUI, file editing  
**Time Commitment:** 15 minutes  
**Task Difficulty:** Very Easy

**Workflow:**
1. Set up worktree
2. Delete 9 lines from MoreView.swift
3. Build project to verify no errors
4. Test in simulator
5. Commit and merge immediately

---

### Agent B: Worktree 2 (FAB + Fun Facts)
**Skills Required:** SwiftUI, iOS 26 design patterns, state management  
**Time Commitment:** 9-11 hours  
**Task Difficulty:** Medium-High

**Workflow:**
1. Set up worktree
2. Complete Task 3 first (3 hours):
   - Extend PregnancyFunFact.swift
   - Add 45 new facts
   - Test rotation
3. Complete Task 2 (6-8 hours):
   - Create FloatingActionPill.swift
   - Integrate into MainTabView
   - Photo logging state management
   - Testing and polish

**Key Challenges:**
- State coordination between managers
- Animation polish
- Camera permissions handling

---

### Agent C: Worktree 3 (Calorie Enhancements)
**Skills Required:** SwiftUI Charts, data modeling, notification system  
**Time Commitment:** 6-8 hours  
**Task Difficulty:** Medium-High

**Workflow:**
1. Set up worktree
2. Phase 1: PregnancyDataManager extensions
3. Phase 2: DailyCalorieTrackerCard UI
4. Phase 3: WeeklyCalorieTrackerCard enhancements
5. Phase 4: NotificationManager logic
6. Phase 5: Integration testing

**Key Challenges:**
- Trimester boundary calculations
- Chart range visualization
- Notification timing logic

---

## Success Criteria

### Individual Task Success

**Task 1:**
- [x] "Food Photo Log" removed from MoreView
- [x] No compiler errors
- [x] App builds and runs

**Task 2:**
- [x] FloatingActionPill renders in bottom-right
- [x] Mic button starts/stops voice recording
- [x] Camera button opens photo options
- [x] Photo capture and library selection work
- [x] No state management conflicts

**Task 3:**
- [x] 45 new facts added to database
- [x] New FactCategory enum cases work
- [x] Trimester-specific facts appear correctly
- [x] Distribution logic (30/30/30/10) implemented

**Task 4:**
- [x] DailyCalorieTrackerCard displays correctly
- [x] WeeklyCalorieTrackerCard shows range bands
- [x] Trimester-specific ranges calculate correctly
- [x] Notifications fire at appropriate times
- [x] Settings toggle controls reminders

### Integration Success
- [x] All 4 tasks merged to master without conflicts
- [x] Full app smoke test passes
- [x] No regressions in existing functionality
- [x] Build time remains acceptable (<30s)
- [x] App performance unaffected
- [x] No memory leaks introduced

---

## Rollback Plan

If critical issues arise during integration:

### Option 1: Revert Individual Task
```bash
git revert <merge-commit-hash>
git push origin master
```

### Option 2: Reset to Pre-Merge State
```bash
git reset --hard <commit-before-merge>
git push --force origin master  # Use with caution
```

### Option 3: Feature Flags (Future Enhancement)
Implement feature flags to disable problematic features without rolling back:
```swift
struct FeatureFlags {
    static let fabPillEnabled = false
    static let calorieRemindersEnabled = false
}
```

---

## Post-Implementation Checklist

### Code Quality
- [ ] All SwiftLint warnings addressed
- [ ] No force unwrapping (`!`) unless documented
- [ ] Debug print statements removed
- [ ] Comments added for complex logic
- [ ] CLAUDE.md updated with new components

### Documentation
- [ ] README.md updated (if needed)
- [ ] Task documentation marked as "Complete"
- [ ] API changes documented
- [ ] New components added to architecture docs

### Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Accessibility testing (VoiceOver, Dynamic Type)
- [ ] Dark mode verified
- [ ] Multiple device sizes tested

### Deployment
- [ ] Build number incremented
- [ ] Xcode project settings validated
- [ ] No hardcoded test data
- [ ] Analytics events added (if applicable)
- [ ] Crash reporting configured

---

## Estimated Completion Timeline

**Optimistic Scenario:** 2 days (16 hours)
- Day 1: Complete Tasks 1, 3, and 80% of Tasks 2 & 4
- Day 2: Finish Tasks 2 & 4, merge, test

**Realistic Scenario:** 2.5 days (20 hours)
- Day 1: Complete Tasks 1 & 3, 70% of Tasks 2 & 4
- Day 2: Finish Tasks 2 & 4, merge, address issues
- Day 3 (half): Final testing and polish

**Pessimistic Scenario:** 3.5 days (28 hours)
- Day 1: Complete Tasks 1 & 3, 50% of Tasks 2 & 4
- Day 2: Continue Tasks 2 & 4
- Day 3: Complete and merge, encounter conflicts
- Day 4 (half): Resolve conflicts and test

**Confidence Level:** 80% for realistic scenario

---

## Contact & Coordination

### Communication Protocol
- **Daily Standup:** Sync at start of each day
- **Blocker Escalation:** Post immediately in shared channel
- **Merge Notifications:** Alert team when merging to master
- **Code Review:** Optional for quick tasks, mandatory for complex (Tasks 2 & 4)

### Coordination Points
1. **After Task 1 merge:** All worktrees rebase on master
2. **After Task 3 complete:** Consider early merge (cherry-pick)
3. **Before Task 4 merge:** Coordinate DashboardView changes with Task 2
4. **Before Task 2 merge:** Final integration test

---

## Appendix: File Modification Summary

### Files to be CREATED
1. `FloatingActionPill.swift` (Task 2)
2. `DailyCalorieTrackerCard.swift` (Task 4)

### Files to be MODIFIED
1. `MoreView.swift` (Task 1) - 9 lines deleted
2. `MainTabView.swift` (Task 2) - Add FAB overlay, photo state
3. `PregnancyFunFact.swift` (Task 3) - Add enum cases + 45 facts
4. `PregnancyDataManager.swift` (Task 4) - Add CalorieRange methods
5. `NotificationManager.swift` (Task 4) - Add calorie reminder logic
6. `LogsManager.swift` (Task 4) - Add threshold check hook
7. `WeeklyCalorieTrackerCard.swift` (Task 4) - Add range visualization
8. `DashboardView.swift` (Tasks 2 & 4, optional) - Add cards, state management

### Files to be DELETED
None

### Total Lines Changed (Estimate)
- **Added:** ~2,500 lines
- **Modified:** ~300 lines
- **Deleted:** ~10 lines

---

## Final Notes

This execution plan provides a robust strategy for parallel implementation of 4 tasks with minimal risk of conflicts. The worktree approach allows multiple developers (or AI agents) to work simultaneously while maintaining clean git history.

**Key Success Factors:**
1. Task 1 merges first (creates clean baseline)
2. Tasks 2, 3, 4 work in complete isolation
3. Clear merge order prevents conflicts
4. Comprehensive testing at each stage
5. Rollback plan ready if needed

**Remember:**
- Commit frequently with clear messages
- Test thoroughly before merging
- Communicate blockers immediately
- Keep branches up to date with master
- Don't merge until peer review complete (for complex tasks)

**Ready to Execute!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** November 2, 2025  
**Status:** Ready for Implementation  
**Next Step:** Set up worktrees and begin execution
