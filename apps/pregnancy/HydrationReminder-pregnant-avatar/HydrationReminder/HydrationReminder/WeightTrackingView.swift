import SwiftUI
import Charts

struct WeightTrackingView: View {
    @StateObject private var healthKitManager = HealthKitManager.shared
    @StateObject private var pregnancyManager = PregnancyDataManager()
    @State private var currentWeight: Double?
    @State private var weightHistory: [WeightSample] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingAddWeight = false
    @State private var newWeight: String = ""
    @State private var selectedDate = Date()
    @State private var selectedWeightSample: WeightSample?

    var body: some View {
        NavigationStack {
            ZStack {
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
                    VStack(spacing: 20) {
                        if healthKitManager.isAuthorized {
                            authorizedContent
                        } else {
                            healthKitAuthorizationCard
                        }
                    }
                    .padding()
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Weight Tracking")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if healthKitManager.isAuthorized {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            showingAddWeight = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
            }
            .sheet(isPresented: $showingAddWeight) {
                AddWeightSheet(
                    weight: $newWeight,
                    date: $selectedDate,
                    onSave: saveWeight
                )
            }
            .task {
                if healthKitManager.isAuthorized {
                    await fetchWeightData()
                }
            }
            .refreshable {
                await fetchWeightData()
            }
        }
    }

    private var authorizedContent: some View {
        Group {
            if isLoading {
                ProgressView("Loading weight data...")
                    .padding()
            } else {
                if let weight = currentWeight {
                    currentWeightCard(weight)
                }

                if !weightHistory.isEmpty {
                    weightTrendChart
                    weightHistoryList
                } else {
                    noDataCard
                }
            }

            if let error = errorMessage {
                errorCard(error)
            }
        }
    }

    private var healthKitAuthorizationCard: some View {
        VStack(spacing: 20) {
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.pink)

            VStack(spacing: 12) {
                Text("Connect to Apple Health")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Track your pregnancy weight gain automatically")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(alignment: .leading, spacing: 12) {
                FeatureRow(icon: "figure.stand.dress", text: "Automatic weight tracking")
                FeatureRow(icon: "lock.shield", text: "All data stays on your device")
                FeatureRow(icon: "apps.iphone", text: "Works with your other health apps")
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)

            Button(action: {
                Task {
                    await requestAuthorization()
                }
            }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Connect to Apple Health")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.pink)

            Text("Corgina will never upload your health data to the cloud")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }

    private func currentWeightCard(_ weight: Double) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current Weight")
                        .font(.headline)

                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(healthKitManager.formatWeight(weight).components(separatedBy: " ").first ?? "")
                            .font(.system(size: 40, weight: .bold))

                        Text(healthKitManager.formatWeight(weight).components(separatedBy: " ").last ?? "")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "figure.stand.dress")
                    .font(.system(size: 50))
                    .foregroundColor(.pink)
            }

            if let firstWeight = weightHistory.last?.weightKg {
                let change = weight - firstWeight
                let changeText = change >= 0 ? "+\(String(format: "%.1f", abs(change))) kg" : "-\(String(format: "%.1f", abs(change))) kg"

                HStack {
                    Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .foregroundColor(change >= 0 ? .green : .orange)
                    Text("\(changeText) since tracking started")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }

    private var weightTrendChart: some View {
        EnhancedWeightChart(
            weightHistory: weightHistory,
            lmpDate: pregnancyManager.pregnancyData?.lmpDate,
            healthKitManager: healthKitManager,
            selectedSample: $selectedWeightSample
        )
    }

    private var weightHistoryList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .padding(.horizontal, 4)

            ForEach(weightHistory.prefix(10)) { sample in
                WeightHistoryRow(sample: sample, healthKitManager: healthKitManager)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }

    private var noDataCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text("No weight data available")
                .font(.headline)
            Text("Add your first weight entry to start tracking")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }

    private func errorCard(_ message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Actions

    private func requestAuthorization() async {
        isLoading = true
        errorMessage = nil

        do {
            let authorized = try await healthKitManager.requestAuthorization()
            if authorized {
                await fetchWeightData()
            } else {
                errorMessage = "Please enable Health access in Settings"
            }
        } catch {
            errorMessage = "Failed to connect to Apple Health: \(error.localizedDescription)"
        }

        isLoading = false
    }

    private func fetchWeightData() async {
        isLoading = true
        errorMessage = nil

        do {
            currentWeight = try await healthKitManager.fetchLatestWeight()

            // Calculate start date: 3 months before pregnancy started
            var startDate: Date
            if let lmpDate = pregnancyManager.pregnancyData?.lmpDate {
                // 3 months before LMP to show pre-pregnancy baseline
                startDate = Calendar.current.date(
                    byAdding: .month,
                    value: -3,
                    to: lmpDate
                ) ?? Date()
            } else {
                // Fallback: Last 40 weeks if no pregnancy data
                startDate = Calendar.current.date(
                    byAdding: .weekOfYear,
                    value: -40,
                    to: Date()
                ) ?? Date()
            }

            weightHistory = try await healthKitManager.fetchWeightSamples(
                startDate: startDate
            )
        } catch {
            errorMessage = "Failed to fetch weight data"
            print("Error fetching weight: \(error)")
        }

        isLoading = false
    }

    private func saveWeight() {
        guard let weightValue = Double(newWeight) else { return }

        isLoading = true
        showingAddWeight = false

        Task {
            do {
                try await healthKitManager.saveWeight(weightKg: weightValue, date: selectedDate)
                await fetchWeightData()
                newWeight = ""
                selectedDate = Date()
            } catch {
                errorMessage = "Failed to save weight: \(error.localizedDescription)"
            }
            isLoading = false
        }
    }
}

// MARK: - Supporting Views

struct FeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.pink)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
            Spacer()
        }
    }
}

struct WeightHistoryRow: View {
    let sample: WeightSample
    let healthKitManager: HealthKitManager

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(healthKitManager.formatWeight(sample.weightKg))
                    .font(.headline)
                Text(sample.source)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(sample.date, style: .date)
                    .font(.caption)
                Text(sample.date, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

struct AddWeightSheet: View {
    @Environment(\.dismiss) var dismiss
    @Binding var weight: String
    @Binding var date: Date
    let onSave: () -> Void

    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Weight (kg)", text: $weight)
                        .keyboardType(.decimalPad)

                    DatePicker("Date", selection: $date, displayedComponents: [.date, .hourAndMinute])
                } header: {
                    Text("Weight Entry")
                }

                Section {
                    Text("Enter your weight in kilograms. The app will automatically sync this to Apple Health.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Add Weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        onSave()
                        dismiss()
                    }
                    .disabled(weight.isEmpty || Double(weight) == nil)
                }
            }
        }
    }
}

#Preview {
    WeightTrackingView()
}
