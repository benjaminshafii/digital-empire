import SwiftUI

struct SupplementTrackerView: View {
    @StateObject private var supplementManager = SupplementManager()
    @State private var showingAddSupplement = false
    @State private var showingTemplates = false
    @State private var selectedSupplement: Supplement?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    if let summary = supplementManager.todaysSummary {
                        todaysSummaryCard(summary)
                    }
                    
                    supplementsList
                    
                    if !supplementManager.getUpcomingReminders().isEmpty {
                        upcomingRemindersCard
                    }
                    
                    quickAddSection
                }
                .padding(.vertical)
            }
            .navigationTitle("Supplements")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddSupplement = true }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.blue)
                    }
                }
            }
            .sheet(isPresented: $showingAddSupplement) {
                AddSupplementView(supplementManager: supplementManager)
            }
            .sheet(isPresented: $showingTemplates) {
                SupplementTemplatesView(supplementManager: supplementManager)
            }
            .sheet(item: $selectedSupplement) { supplement in
                SupplementDetailView(supplement: supplement, supplementManager: supplementManager)
            }
        }
    }
    
    private func todaysSummaryCard(_ summary: SupplementManager.SupplementSummary) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Today's Progress")
                .font(.headline)
                .foregroundColor(.secondary)
                .accessibilityAddTraits(.isHeader)

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(summary.takenToday)/\(summary.totalSupplements)")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(summary.takenToday == summary.totalSupplements ? .green : .primary)
                    Text("Supplements Taken")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(summary.takenToday) of \(summary.totalSupplements) supplements taken today")

                Spacer()

                CircularProgressView(
                    progress: Double(summary.takenToday) / Double(max(summary.totalSupplements, 1)),
                    lineWidth: 10
                )
                .frame(width: 90, height: 90)
            }

            if summary.missedToday > 0 {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("\(summary.missedToday) supplements still needed today")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                        )
                )
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Warning: \(summary.missedToday) supplements still needed today")
            }

            HStack {
                Label("7-Day Compliance", systemImage: "chart.line.uptrend.xyaxis")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(Int(summary.complianceRate * 100))%")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(summary.complianceRate > 0.8 ? .green : .orange)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("7-day compliance: \(Int(summary.complianceRate * 100)) percent")
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            LinearGradient(
                                colors: [.blue.opacity(0.3), .purple.opacity(0.2)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
        )
        .padding(.horizontal)
    }
    
    private var supplementsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("My Supplements")
                .font(.headline)
                .padding(.horizontal)
                .accessibilityAddTraits(.isHeader)

            ForEach(supplementManager.getTodaysIntake(), id: \.supplement.id) { item in
                SupplementRow(
                    supplement: item.supplement,
                    taken: item.taken,
                    timesNeeded: item.timesNeeded,
                    onTap: {
                        selectedSupplement = item.supplement
                    },
                    onToggle: {
                        supplementManager.logIntake(supplementId: item.supplement.id, taken: !item.taken)
                    }
                )
                .transition(.asymmetric(
                    insertion: .scale.combined(with: .opacity),
                    removal: .opacity
                ))
            }
        }
        .animation(.spring(duration: 0.4, bounce: 0.2), value: supplementManager.getTodaysIntake().count)
    }
    
    private var upcomingRemindersCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upcoming Reminders")
                .font(.headline)
                .foregroundColor(.secondary)

            ForEach(supplementManager.getUpcomingReminders().prefix(3), id: \.0.id) { reminder in
                HStack(spacing: 12) {
                    Image(systemName: "bell.fill")
                        .foregroundColor(.blue)
                        .font(.subheadline)

                    Text(reminder.0.name)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Spacer()

                    Text(formatTime(reminder.1))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(.ultraThinMaterial)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                                )
                        )
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            LinearGradient(
                                colors: [.blue.opacity(0.2), .blue.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .padding(.horizontal)
    }
    
    private var quickAddSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Add")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(["Prenatal", "Iron", "Vitamin D", "DHA", "Folic Acid"], id: \.self) { name in
                        Button(action: {
                            supplementManager.addFromTemplate(name)
                        }) {
                            Text(name)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(
                                    RoundedRectangle(cornerRadius: 20)
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 20)
                                                .stroke(
                                                    LinearGradient(
                                                        colors: [.blue.opacity(0.4), .blue.opacity(0.2)],
                                                        startPoint: .topLeading,
                                                        endPoint: .bottomTrailing
                                                    ),
                                                    lineWidth: 1
                                                )
                                        )
                                )
                                .foregroundColor(.blue)
                        }
                        .disabled(supplementManager.supplements.contains(where: { $0.name.contains(name) }))
                        .opacity(supplementManager.supplements.contains(where: { $0.name.contains(name) }) ? 0.5 : 1.0)
                    }

                    Button(action: { showingTemplates = true }) {
                        Label("More", systemImage: "ellipsis")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(.ultraThinMaterial)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 20)
                                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                    )
                            )
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct SupplementRow: View {
    let supplement: Supplement
    let taken: Bool
    let timesNeeded: Int
    let onTap: () -> Void
    let onToggle: () -> Void

    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State private var isPressed = false

    var body: some View {
        HStack(spacing: 12) {
            // Checkbox button with borderless style to not intercept row taps
            Button(action: {
                performToggle()
            }) {
                Image(systemName: taken ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(taken ? .green : .gray)
                    .font(.title2)
                    .scaleEffect(isPressed ? 0.9 : 1.0)
            }
            .buttonStyle(.borderless)
            .frame(minWidth: 44, minHeight: 44)
            .sensoryFeedback(.success, trigger: taken) { oldValue, newValue in
                newValue == true
            }
            .accessibilityLabel(taken ? "Marked as taken" : "Mark as taken")
            .accessibilityHint("Double tap to toggle")

            // Main content area
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text(supplement.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    if supplement.isEssential {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption2)
                            .accessibilityLabel("Essential supplement")
                    }

                    // Multiple dose indicators for twice/thrice daily
                    if timesNeeded > 1 {
                        DoseIndicatorView(taken: supplement.todaysTaken(), needed: timesNeeded)
                    }
                }

                // Dosage and frequency info
                HStack(spacing: 8) {
                    Text(supplement.dosage)
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text("•")
                        .foregroundColor(.secondary)
                        .font(.caption)

                    Text(supplement.frequency.rawValue)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .accessibilityElement(children: .combine)

            Spacer(minLength: 16)

            // Chevron indicator (visual only, not interactive)
            Image(systemName: "chevron.right")
                .foregroundColor(.gray.opacity(0.5))
                .font(.caption)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemBackground))
        )
        .padding(.horizontal)
        .contentShape(Rectangle()) // Makes entire row tappable
        .onTapGesture {
            onTap()
        }
        .accessibilityElement(children: .contain)
        .accessibilityAction(named: "Show details") {
            onTap()
        }
    }

    private func performToggle() {
        if reduceMotion {
            onToggle()
        } else {
            withAnimation(.spring(duration: 0.3, bounce: 0.3)) {
                isPressed = true
            }

            // Reset press state
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.spring(duration: 0.2, bounce: 0.2)) {
                    isPressed = false
                }
            }

            onToggle()
        }
    }
}

// iOS 26 style dose indicator with liquid glass badges
struct DoseIndicatorView: View {
    let taken: Int
    let needed: Int

    var body: some View {
        HStack(spacing: 6) {
            // Circle indicators
            HStack(spacing: 4) {
                ForEach(0..<needed, id: \.self) { index in
                    Circle()
                        .fill(index < taken ? Color.green : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                        .overlay(
                            Circle()
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                        .scaleEffect(index < taken ? 1.0 : 0.8)
                        .animation(.spring(duration: 0.3, bounce: 0.3), value: taken)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(.ultraThinMaterial)
            )

            // Badge with count
            Text("\(taken)/\(needed)")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(taken >= needed ? .green : .orange)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .overlay(
                            Capsule()
                                .stroke(
                                    LinearGradient(
                                        colors: taken >= needed ?
                                            [.green.opacity(0.3), .green.opacity(0.1)] :
                                            [.orange.opacity(0.3), .orange.opacity(0.1)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 1
                                )
                        )
                )
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(taken) of \(needed) doses taken")
    }
}

struct AddSupplementView: View {
    @ObservedObject var supplementManager: SupplementManager
    @Environment(\.dismiss) var dismiss
    
    @State private var name = ""
    @State private var dosage = ""
    @State private var frequency = Supplement.SupplementFrequency.daily
    @State private var reminderEnabled = true
    @State private var reminderTime = Date()
    @State private var notes = ""
    @State private var isEssential = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Supplement Information")) {
                    TextField("Name", text: $name)
                    TextField("Dosage (e.g., 400mg, 1 tablet)", text: $dosage)
                    
                    Picker("Frequency", selection: $frequency) {
                        ForEach(Supplement.SupplementFrequency.allCases, id: \.self) { freq in
                            Text(freq.rawValue).tag(freq)
                        }
                    }
                    
                    Toggle("Essential Supplement", isOn: $isEssential)
                }
                
                Section(header: Text("Reminders")) {
                    Toggle("Enable Reminders", isOn: $reminderEnabled)
                    
                    if reminderEnabled {
                        DatePicker("Reminder Time", selection: $reminderTime, displayedComponents: .hourAndMinute)
                    }
                }
                
                Section(header: Text("Notes")) {
                    TextEditor(text: $notes)
                        .frame(height: 80)
                }
            }
            .navigationTitle("Add Supplement")
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() },
                trailing: Button("Save") { saveSupplement() }
                    .disabled(name.isEmpty || dosage.isEmpty)
            )
        }
    }
    
    private func saveSupplement() {
        let supplement = Supplement(
            name: name,
            dosage: dosage,
            frequency: frequency,
            reminderTimes: reminderEnabled ? [reminderTime] : [],
            remindersEnabled: reminderEnabled,
            notes: notes.isEmpty ? nil : notes,
            isEssential: isEssential
        )
        
        supplementManager.addSupplement(supplement)
        dismiss()
    }
}

struct SupplementDetailView: View {
    @State var supplement: Supplement
    @ObservedObject var supplementManager: SupplementManager
    @Environment(\.dismiss) var dismiss
    @State private var isEditing = false
    @State private var editedName: String = ""
    @State private var editedDosage: String = ""
    @State private var editedFrequency: Supplement.SupplementFrequency = .daily
    @State private var editedReminderTime: Date = Date()
    @State private var editedNotes: String = ""
    @State private var editedIsEssential: Bool = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if isEditing {
                        editingCard
                    } else {
                        supplementInfoCard
                    }
                    
                    complianceCard
                    intakeHistoryCard
                    
                    if !supplementManager.checkInteractions(supplement).isEmpty {
                        interactionsCard
                    }
                    
                    deleteButton
                }
                .padding(.vertical)
            }
            .navigationTitle(supplement.name)
            .navigationBarItems(
                leading: isEditing ? Button("Cancel") { 
                    isEditing = false
                    resetEditFields()
                } : nil,
                trailing: Button(isEditing ? "Save" : "Edit") { 
                    if isEditing {
                        saveChanges()
                    } else {
                        startEditing()
                    }
                }
            )
        }
        .onAppear {
            resetEditFields()
        }
    }
    
    private var editingCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Edit Details", systemImage: "pencil.circle.fill")
                .font(.headline)
                .foregroundColor(.blue)

            VStack(alignment: .leading, spacing: 12) {
                // Name
                VStack(alignment: .leading, spacing: 4) {
                    Text("Name")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    TextField("Supplement name", text: $editedName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }

                // Dosage
                VStack(alignment: .leading, spacing: 4) {
                    Text("Dosage")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    TextField("e.g., 500mg", text: $editedDosage)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }

                // Frequency
                VStack(alignment: .leading, spacing: 4) {
                    Text("Frequency")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    Picker("Frequency", selection: $editedFrequency) {
                        ForEach(Supplement.SupplementFrequency.allCases, id: \.self) { freq in
                            Text(freq.rawValue).tag(freq)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                // Reminder Time
                VStack(alignment: .leading, spacing: 4) {
                    Text("Reminder Time")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    DatePicker("", selection: $editedReminderTime, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                }

                // Essential Toggle
                Toggle(isOn: $editedIsEssential) {
                    HStack(spacing: 8) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text("Essential Supplement")
                            .font(.subheadline)
                    }
                }
                .padding(.vertical, 8)

                // Notes
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes (optional)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fontWeight(.medium)
                    TextField("Additional notes", text: $editedNotes, axis: .vertical)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .lineLimit(2...4)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            LinearGradient(
                                colors: [.blue.opacity(0.3), .blue.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
    
    private var supplementInfoCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Details", systemImage: "info.circle.fill")
                .font(.headline)
                .foregroundColor(.blue)

            VStack(alignment: .leading, spacing: 8) {
                detailRow(label: "Dosage", value: supplement.dosage)
                detailRow(label: "Frequency", value: supplement.frequency.rawValue)

                if supplement.isEssential {
                    HStack(spacing: 8) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                        Text("Essential Supplement")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.ultraThinMaterial)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.yellow.opacity(0.3), lineWidth: 1)
                            )
                    )
                }

                if let notes = supplement.notes {
                    detailRow(label: "Notes", value: notes)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            LinearGradient(
                                colors: [.blue.opacity(0.3), .blue.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
    
    private var complianceCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Compliance", systemImage: "chart.bar.fill")
                .font(.headline)
                .foregroundColor(.green)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(Int(supplement.complianceRate(days: 7) * 100))%")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(supplement.complianceRate(days: 7) > 0.8 ? .green : .orange)
                    Text("7-Day Compliance")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(Int(supplement.complianceRate(days: 30) * 100))%")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(supplement.complianceRate(days: 30) > 0.8 ? .green : .orange)
                    Text("30-Day")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            LinearGradient(
                                colors: [.green.opacity(0.3), .green.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
    
    private var intakeHistoryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Recent History", systemImage: "clock.fill")
                .font(.headline)
                .foregroundColor(.purple)

            ForEach(supplement.intakeHistory.suffix(7).reversed()) { record in
                HStack(spacing: 12) {
                    Image(systemName: record.taken ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(record.taken ? .green : .red)
                        .font(.subheadline)

                    Text(formatDate(record.date))
                        .font(.subheadline)

                    Spacer()

                    if let notes = record.notes {
                        Text(notes)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            LinearGradient(
                                colors: [.purple.opacity(0.3), .purple.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
    
    private var interactionsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Interactions", systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundColor(.orange)

            ForEach(supplementManager.checkInteractions(supplement), id: \.self) { warning in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text(warning)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.vertical, 4)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            LinearGradient(
                                colors: [.orange.opacity(0.3), .orange.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
    
    private var deleteButton: some View {
        Button(action: {
            supplementManager.deleteSupplement(supplement)
            dismiss()
        }) {
            Label("Delete Supplement", systemImage: "trash")
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red.opacity(0.1))
                .foregroundColor(.red)
                .cornerRadius(10)
        }
        .padding(.horizontal)
    }
    
    private func detailRow(label: String, value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            
            Text(value)
                .font(.subheadline)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
    
    private func startEditing() {
        isEditing = true
        resetEditFields()
    }
    
    private func resetEditFields() {
        editedName = supplement.name
        editedDosage = supplement.dosage
        editedFrequency = supplement.frequency
        editedReminderTime = supplement.reminderTimes.first ?? Date()
        editedNotes = supplement.notes ?? ""
        editedIsEssential = supplement.isEssential
    }
    
    private func saveChanges() {
        // Update the supplement
        supplement.name = editedName
        supplement.dosage = editedDosage
        supplement.frequency = editedFrequency
        supplement.reminderTimes = [editedReminderTime]
        supplement.notes = editedNotes.isEmpty ? nil : editedNotes
        supplement.isEssential = editedIsEssential
        
        // Update in manager
        supplementManager.updateSupplement(supplement)
        
        // Update reminder if time changed
        if !supplement.reminderTimes.isEmpty {
            supplementManager.scheduleReminder(for: supplement)
        }
        
        isEditing = false
    }
}

struct SupplementTemplatesView: View {
    @ObservedObject var supplementManager: SupplementManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            List(PregnancySupplements.commonSupplements) { template in
                HStack {
                    VStack(alignment: .leading) {
                        Text(template.name)
                            .font(.headline)
                        Text(template.dosage)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        if let notes = template.notes {
                            Text(notes)
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                    
                    Spacer()
                    
                    if template.isEssential {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    supplementManager.addFromTemplate(template.name)
                    dismiss()
                }
            }
            .navigationTitle("Common Supplements")
            .navigationBarItems(trailing: Button("Cancel") { dismiss() })
        }
    }
}

struct CircularProgressView: View {
    let progress: Double
    let lineWidth: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: CGFloat(progress))
                .stroke(
                    progress == 1.0 ? Color.green : Color.blue,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.spring(duration: 0.5, bounce: 0.2), value: progress)

            Text("\(Int(progress * 100))%")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.primary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Progress: \(Int(progress * 100)) percent")
    }
}