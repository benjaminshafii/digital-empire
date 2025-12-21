import SwiftUI

struct PregnancyDateEntryView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var pregnancyManager: PregnancyDataManager

    @State private var selectedMethod: PregnancyData.EntryMethod = .dueDate
    @State private var dueDate = Date().addingTimeInterval(86400 * 280) // ~40 weeks from now
    @State private var lmpDate = Date()
    @State private var ultrasoundDate = Date()
    @State private var ultrasoundWeeks = 12
    @State private var ultrasoundDays = 0

    @State private var validationError: String?
    @State private var showingSaveConfirmation = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color.pink.opacity(0.15),
                        Color.purple.opacity(0.1),
                        Color(.systemGroupedBackground)
                    ],
                    startPoint: .topLeading,
                    endPoint: .center
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        headerSection

                        // Entry method selector
                        entryMethodSelector

                        // Date entry section
                        dateEntrySection
                            .padding(.top, 8)

                        // Calculated information
                        if validationError == nil {
                            calculatedInfoSection
                        }

                        // Validation error
                        if let error = validationError {
                            errorSection(error)
                        }
                    }
                    .padding()
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Pregnancy Tracking")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        savePregnancyData()
                    }
                    .fontWeight(.semibold)
                    .disabled(validationError != nil)
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .alert("Pregnancy Tracking Set", isPresented: $showingSaveConfirmation) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Your pregnancy information has been saved successfully.")
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 8) {
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.pink, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("Set Up Pregnancy Tracking")
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            Text("Choose your preferred method to calculate your due date")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Entry Method Selector

    private var entryMethodSelector: some View {
        VStack(spacing: 12) {
            Text("Entry Method")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 12) {
                entryMethodOption(.dueDate, icon: "calendar.badge.clock", description: "I know my due date")
                entryMethodOption(.lmp, icon: "calendar", description: "I know my last period date")
                entryMethodOption(.ultrasound, icon: "waveform.path.ecg", description: "I have ultrasound results")
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
        )
    }

    private func entryMethodOption(_ method: PregnancyData.EntryMethod, icon: String, description: String) -> some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                selectedMethod = method
                validationError = nil
            }
        } label: {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(selectedMethod == method ? Color.pink : Color.secondary)
                    .frame(width: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(method.rawValue)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)

                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: selectedMethod == method ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(selectedMethod == method ? Color.pink : Color.secondary.opacity(0.3))
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(selectedMethod == method ? Color.pink.opacity(0.1) : Color(.systemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(
                        selectedMethod == method ? Color.pink.opacity(0.5) : Color.clear,
                        lineWidth: 2
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Date Entry Section

    private var dateEntrySection: some View {
        VStack(spacing: 16) {
            switch selectedMethod {
            case .dueDate:
                dueDatePicker
            case .lmp:
                lmpDatePicker
            case .ultrasound:
                ultrasoundPickers
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
        )
    }

    private var dueDatePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Due Date")
                .font(.headline)

            DatePicker(
                "Select Date",
                selection: $dueDate,
                displayedComponents: [.date]
            )
            .datePickerStyle(.wheel)
            .labelsHidden()
            .onChange(of: dueDate) { oldValue, newValue in
                validateDueDate(newValue)
            }

            Text("Your baby's estimated due date")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var lmpDatePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Last Menstrual Period (LMP)")
                .font(.headline)

            DatePicker(
                "Select Date",
                selection: $lmpDate,
                displayedComponents: [.date]
            )
            .datePickerStyle(.wheel)
            .labelsHidden()
            .onChange(of: lmpDate) { oldValue, newValue in
                validateLMPDate(newValue)
            }

            Text("First day of your last menstrual period")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var ultrasoundPickers: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Ultrasound Date")
                    .font(.headline)

                DatePicker(
                    "Select Date",
                    selection: $ultrasoundDate,
                    displayedComponents: [.date]
                )
                .datePickerStyle(.compact)
                .onChange(of: ultrasoundDate) { oldValue, newValue in
                    validateUltrasoundDate(newValue)
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                Text("Gestational Age at Ultrasound")
                    .font(.headline)

                HStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("Weeks")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Picker("Weeks", selection: $ultrasoundWeeks) {
                            ForEach(4...42, id: \.self) { week in
                                Text("\(week)").tag(week)
                            }
                        }
                        .pickerStyle(.wheel)
                        .frame(width: 100, height: 120)
                        .clipped()
                        .onChange(of: ultrasoundWeeks) { oldValue, newValue in
                            validateUltrasoundDate(ultrasoundDate)
                        }
                    }

                    VStack(spacing: 8) {
                        Text("Days")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Picker("Days", selection: $ultrasoundDays) {
                            ForEach(0...6, id: \.self) { day in
                                Text("\(day)").tag(day)
                            }
                        }
                        .pickerStyle(.wheel)
                        .frame(width: 100, height: 120)
                        .clipped()
                        .onChange(of: ultrasoundDays) { oldValue, newValue in
                            validateUltrasoundDate(ultrasoundDate)
                        }
                    }
                }
            }

            Text("The gestational age measured during your ultrasound")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Calculated Information Section

    private var calculatedInfoSection: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Calculated Information")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 12) {
                if let calculatedDueDate = getCalculatedDueDate() {
                    calculatedInfoRow(
                        icon: "calendar.badge.clock",
                        label: "Due Date",
                        value: formatDate(calculatedDueDate),
                        color: .pink
                    )
                }

                if let calculatedLMP = getCalculatedLMP() {
                    calculatedInfoRow(
                        icon: "calendar",
                        label: "LMP Date",
                        value: formatDate(calculatedLMP),
                        color: .purple
                    )
                }

                if let currentWeek = getCurrentWeek() {
                    calculatedInfoRow(
                        icon: "clock.fill",
                        label: "Current Week",
                        value: "Week \(currentWeek)",
                        color: .blue
                    )
                }

                if let trimester = getCurrentTrimester() {
                    calculatedInfoRow(
                        icon: "star.fill",
                        label: "Trimester",
                        value: ordinal(trimester) + " Trimester",
                        color: .orange
                    )
                }

                if let daysRemaining = getDaysRemaining() {
                    calculatedInfoRow(
                        icon: "hourglass",
                        label: "Days Until Due",
                        value: "\(daysRemaining) days",
                        color: .green
                    )
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [.white.opacity(0.3), .white.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                        .blendMode(.overlay)
                )
        )
    }

    private func calculatedInfoRow(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)
                .frame(width: 32, height: 32)
                .background(
                    Circle()
                        .fill(color.opacity(0.15))
                )

            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.primary)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(.systemBackground).opacity(0.5))
        )
    }

    // MARK: - Error Section

    private func errorSection(_ error: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.title3)
                .foregroundStyle(.orange)

            Text(error)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.orange.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.orange.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Validation Methods

    private func validateDueDate(_ date: Date) {
        validationError = PregnancyDataManager.validateDueDate(date)
    }

    private func validateLMPDate(_ date: Date) {
        validationError = PregnancyDataManager.validateLMPDate(date)
    }

    private func validateUltrasoundDate(_ date: Date) {
        let today = Date()
        if date > today {
            validationError = "Ultrasound date cannot be in the future"
        } else if let minDate = Calendar.current.date(byAdding: .day, value: -294, to: today),
                  date < minDate {
            validationError = "Ultrasound date seems too far in the past"
        } else {
            validationError = nil
        }
    }

    // MARK: - Calculation Methods

    private func getCalculatedDueDate() -> Date? {
        switch selectedMethod {
        case .dueDate:
            return dueDate
        case .lmp:
            return PregnancyDataManager.calculateDueDateFromLMP(lmpDate)
        case .ultrasound:
            return PregnancyDataManager.calculateDueDateFromUltrasound(
                ultrasoundDate: ultrasoundDate,
                gestationalAgeWeeks: ultrasoundWeeks,
                gestationalAgeDays: ultrasoundDays
            )
        }
    }

    private func getCalculatedLMP() -> Date? {
        switch selectedMethod {
        case .dueDate:
            return PregnancyDataManager.calculateLMPFromDueDate(dueDate)
        case .lmp:
            return lmpDate
        case .ultrasound:
            if let calculatedDue = getCalculatedDueDate() {
                return PregnancyDataManager.calculateLMPFromDueDate(calculatedDue)
            }
            return nil
        }
    }

    private func getCurrentWeek() -> Int? {
        guard let lmp = getCalculatedLMP() else { return nil }
        let daysSinceLMP = Calendar.current.dateComponents([.day], from: lmp, to: Date()).day ?? 0
        return min(max(daysSinceLMP / 7, 0), 42)
    }

    private func getCurrentTrimester() -> Int? {
        guard let week = getCurrentWeek() else { return nil }
        if week <= 13 { return 1 }
        if week <= 27 { return 2 }
        return 3
    }

    private func getDaysRemaining() -> Int? {
        guard let due = getCalculatedDueDate() else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: due).day
    }

    // MARK: - Save Method

    private func savePregnancyData() {
        guard validationError == nil else { return }

        let data = PregnancyData(
            dueDate: getCalculatedDueDate(),
            lmpDate: getCalculatedLMP(),
            conceptionDate: nil,
            entryMethod: selectedMethod
        )

        pregnancyManager.savePregnancyData(data)
        showingSaveConfirmation = true
    }

    // MARK: - Helper Methods

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    private func ordinal(_ number: Int) -> String {
        switch number {
        case 1: return "1st"
        case 2: return "2nd"
        case 3: return "3rd"
        default: return "\(number)th"
        }
    }
}

#Preview {
    PregnancyDateEntryView(pregnancyManager: PregnancyDataManager())
}
