import SwiftUI
import PhotosUI

// Corner radius extension for specific corners
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

struct DashboardView: View {
    @StateObject private var photoLogManager = PhotoFoodLogManager()
    @StateObject private var voiceLogManager = VoiceLogManager.shared
    @StateObject private var supplementManager = SupplementManager()
    @StateObject private var puqeManager = PUQEManager()
    @StateObject private var openAIManager = OpenAIManager.shared
    @StateObject private var healthKitManager = HealthKitManager.shared
    @StateObject private var pregnancyManager = PregnancyDataManager()
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var notificationManager: NotificationManager

    @State private var showingCamera = false
    @State private var showingPhotoOptions = false
    @State private var capturedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?
    @State private var showingAddNotes = false
    @State private var tempImageData: Data?
    @State private var notes = ""
    @State private var selectedMealType: MealType?
    @State private var selectedDate = Date()
    @State private var showAPIKeyError = false

    @State private var showingPhotoPicker = false
    @State private var isProcessingPhoto = false
    @State private var photoProcessingStatus = ""
    @State private var photoProcessingProgress: PhotoProcessingStage = .none

    @State private var currentWeight: Double?
    @State private var isLoadingWeight = false
    @State private var showingPregnancyDateEntry = false

    enum PhotoProcessingStage {
        case none
        case uploading
        case analyzing
        case recognized
        case complete
        
        var message: String {
            switch self {
            case .none: return ""
            case .uploading: return "Uploading photo..."
            case .analyzing: return "Analyzing with AI..."
            case .recognized: return "Food recognized!"
            case .complete: return "Added to activity log"
            }
        }
        
        var icon: String {
            switch self {
            case .none: return ""
            case .uploading: return "icloud.and.arrow.up"
            case .analyzing: return "brain"
            case .recognized: return "checkmark.circle"
            case .complete: return "checkmark.circle.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .none: return .gray
            case .uploading: return .blue
            case .analyzing: return .purple
            case .recognized: return .orange
            case .complete: return .green
            }
        }
    }
    
    private var todaysDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }
    
    private let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    private func timeUntilString(_ date: Date) -> String {
        let interval = date.timeIntervalSinceNow
        if interval < 0 {
            return "overdue"
        }
        
        let hours = Int(interval) / 3600
        let minutes = Int(interval) % 3600 / 60
        
        if hours > 0 {
            return "in \(hours)h \(minutes)m"
        } else if minutes > 0 {
            return "in \(minutes)m"
        } else {
            return "soon"
        }
    }
    
    private func getGreeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Good Morning"
        case 12..<17: return "Good Afternoon"
        default: return "Good Evening"
        }
    }
    
    private var todaysNutrition: (calories: Int, protein: Double, carbs: Double, fat: Double, fiber: Double) {
        // Combine nutrition from all sources
        var totalCalories = 0
        var totalProtein = 0.0
        var totalCarbs = 0.0
        var totalFat = 0.0
        var totalFiber = 0.0
        
        // Add from photo logs
        let todaysPhotos = photoLogManager.getLogsForToday()
        for photo in todaysPhotos {
            if let analysis = photo.aiAnalysis {
                totalCalories += analysis.totalCalories ?? 0
                totalProtein += analysis.totalProtein ?? 0
                totalCarbs += analysis.totalCarbs ?? 0
                totalFat += analysis.totalFat ?? 0
                totalFiber += analysis.totalFiber ?? 0
            }
        }
        
        // Add from voice/manual logs with macros
        let todaysLogs = logsManager.getTodayLogs()
        for log in todaysLogs where log.type == .food {
            totalCalories += log.calories ?? 0
            totalProtein += Double(log.protein ?? 0)
            totalCarbs += Double(log.carbs ?? 0)
            totalFat += Double(log.fat ?? 0)
        }
        
        return (totalCalories, totalProtein, totalCarbs, totalFat, totalFiber)
    }
    
    private var todaysWaterIntake: Int {
        logsManager.getTodayWaterCount()
    }
    
    private var todaysFoodCount: Int {
        logsManager.getTodayFoodCount() + photoLogManager.getLogsForToday().count
    }
    
    var body: some View {
        mainNavigationView
            .sheet(isPresented: $showingCamera) {
                cameraSheetView
            }
            .sheet(isPresented: $showingAddNotes) {
                addNotesSheetView
            }
            .sheet(isPresented: $showingPregnancyDateEntry) {
                PregnancyDateEntryView(pregnancyManager: pregnancyManager)
            }
            .onAppear {
                voiceLogManager.configure(logsManager: logsManager, supplementManager: supplementManager)
            }
            .confirmationDialog("Add Food Photo", isPresented: $showingPhotoOptions) {
                photoOptionsDialogView
            } message: {
                Text("How would you like to add a food photo?")
            }
            .sheet(isPresented: $showingPhotoPicker) {
                photoPickerSheetView
            }
            .onChange(of: selectedItem) { oldValue, newItem in
                Task {
                    if let newItem = newItem {
                        if let data = try? await newItem.loadTransferable(type: Data.self) {
                            tempImageData = data
                            selectedItem = nil
                            showingPhotoPicker = false
                            notes = ""
                            selectedMealType = nil
                            selectedDate = Date()
                            savePhotoLog()
                        }
                    }
                }
            }
    }
    
    private var mainNavigationView: some View {
        NavigationStack {
            mainContentView
                .navigationTitle(getGreeting())
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    navigationToolbarContent
                }
                .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
                .toolbarBackground(.visible, for: .navigationBar)
        }
    }
    
    @ToolbarContentBuilder
    private var navigationToolbarContent: some ToolbarContent {
        ToolbarItem(placement: .principal) {
            VStack(spacing: 2) {
                Text(getGreeting())
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("Corgina")
                    .font(.headline)
                    .fontWeight(.bold)
            }
        }
    }
    
    private var mainContentView: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: [
                    Color.blue.opacity(0.15),
                    Color.purple.opacity(0.1),
                    Color(.systemGroupedBackground)
                ],
                startPoint: .topLeading,
                endPoint: .center
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    nextRemindersCard

                    // Pregnancy tracking cards
                    if pregnancyManager.isPregnancyDataSet,
                       let pregnancyData = pregnancyManager.pregnancyData {
                        CurrentWeekCard(pregnancyData: pregnancyData)

                        if let babySize = pregnancyManager.currentBabySize {
                            BabySizeCard(babySize: babySize)
                        }
                    } else {
                        pregnancySetupCard
                    }

                    if isProcessingPhoto {
                        photoProcessingCard
                    }

                    hydrationCard

                    foodCard

                    weightTrackingCard

                    DailyCalorieTrackerCard()
                        .environmentObject(logsManager)

                    WeeklyCalorieTrackerCard()
                        .environmentObject(logsManager)

                    if let summary = supplementManager.todaysSummary {
                        vitaminCard(summary)
                    }

                    if let todaysScore = puqeManager.todaysScore {
                        puqeScoreCard(todaysScore)
                    }

                    recentActivitySection
                }
                .padding()
                .padding(.bottom, 20)
            }
            
            if showAPIKeyError {
                VStack {
                    Color.clear.frame(height: 80)
                    APIKeyErrorBanner(onDismiss: {
                        showAPIKeyError = false
                    })
                    .transition(.move(edge: .top).combined(with: .opacity))
                    Spacer()
                }
                .zIndex(2)
            }
        }
    }
    
    private var cameraSheetView: some View {
        CameraView(image: $capturedImage)
            .onDisappear {
                if let image = capturedImage,
                   let data = image.jpegData(compressionQuality: 0.8) {
                    tempImageData = data
                    capturedImage = nil
                    notes = ""
                    selectedMealType = nil
                    selectedDate = Date()
                    savePhotoLog()
                }
            }
    }
    
    private var addNotesSheetView: some View {
        AddNotesView(
            imageData: $tempImageData,
            notes: $notes,
            mealType: $selectedMealType,
            selectedDate: $selectedDate,
            onSave: savePhotoLog,
            onCancel: {
                showingAddNotes = false
                tempImageData = nil
                notes = ""
                selectedMealType = nil
                selectedDate = Date()
            }
        )
    }
    
    @ViewBuilder
    private var photoOptionsDialogView: some View {
        Button("Take Photo") {
            showingCamera = true
        }
        Button("Choose from Library") {
            showingPhotoPicker = true
        }
        Button("Cancel", role: .cancel) { }
    }
    
    private var photoPickerSheetView: some View {
        NavigationView {
            VStack {
                PhotosPicker(
                    selection: $selectedItem,
                    matching: .images,
                    photoLibrary: .shared()
                ) {
                    VStack(spacing: 20) {
                        Image(systemName: "photo.on.rectangle.angled")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)
                        Text("Tap to Select Photo")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text("Choose a photo from your library")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("Select Food Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        showingPhotoPicker = false
                    }
                }
            }
        }
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Good \(getTimeOfDay())!")
                .font(.largeTitle)
                .fontWeight(.bold)
            Text(todaysDate)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var nextRemindersCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "bell.fill")
                    .foregroundColor(.purple)
                Text("Next Reminders")
                    .font(.headline)
                Spacer()
            }
            
            HStack(spacing: 20) {
                // Water reminder
                if notificationManager.drinkingEnabled,
                   let nextWater = notificationManager.nextDrinkingNotification {
                    VStack(spacing: 6) {
                        HStack(spacing: 4) {
                            Image(systemName: "drop.fill")
                                .font(.caption)
                                .foregroundColor(.blue)
                            Text("Water")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Text(timeFormatter.string(from: nextWater))
                            .font(.system(.title3, design: .rounded))
                            .fontWeight(.semibold)
                        Text(timeUntilString(nextWater))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(10)
                }
                
                // Meal reminder
                if notificationManager.eatingEnabled,
                   let nextMeal = notificationManager.nextEatingNotification {
                    VStack(spacing: 6) {
                        HStack(spacing: 4) {
                            Image(systemName: "fork.knife")
                                .font(.caption)
                                .foregroundColor(.orange)
                            Text("Meal")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Text(timeFormatter.string(from: nextMeal))
                            .font(.system(.title3, design: .rounded))
                            .fontWeight(.semibold)
                        Text(timeUntilString(nextMeal))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(10)
                }
            }
            
            // Show message if no reminders are enabled
            if !notificationManager.drinkingEnabled && !notificationManager.eatingEnabled {
                Text("No reminders enabled")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
    
    private var nutritionSummaryCard: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text("Today's Nutrition")
                    .font(.headline)
                Spacer()
                if todaysNutrition.calories > 0 {
                    Text("\(todaysNutrition.calories) cal")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                }
            }
            
            if todaysNutrition.calories > 0 {
                HStack(spacing: 20) {
                    MacroView(
                        label: "Protein",
                        value: Int(todaysNutrition.protein),
                        unit: "g",
                        color: .red
                    )
                    
                    MacroView(
                        label: "Carbs",
                        value: Int(todaysNutrition.carbs),
                        unit: "g",
                        color: .blue
                    )
                    
                    MacroView(
                        label: "Fat",
                        value: Int(todaysNutrition.fat),
                        unit: "g",
                        color: .green
                    )
                    
                    MacroView(
                        label: "Fiber",
                        value: Int(todaysNutrition.fiber),
                        unit: "g",
                        color: .brown
                    )
                }
            } else {
                Text("No food logged yet today")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
    
    private var hydrationCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Hydration")
                        .font(.headline)
                    Text("\(todaysWaterIntake * 237) ml today")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "drop.fill")
                    .font(.title)
                    .foregroundColor(.blue)
            }
            
            HStack(spacing: 12) {
                ForEach([125, 250, 375, 500], id: \.self) { ml in
                    Button(action: {
                        logsManager.logWater(amount: ml, unit: "ml", source: .manual)
                    }) {
                        Text("\(ml)ml")
                            .font(.caption)
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                }
            }
            
            Button(action: {
                logsManager.logWater(amount: 250, unit: "ml", source: .manual)
            }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Quick Add 250ml")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.blue)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
    
    private func vitaminCard(_ summary: SupplementManager.SupplementSummary) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Vitamins & Supplements")
                        .font(.headline)
                    Text("\(summary.takenToday)/\(summary.totalSupplements) taken today")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                CircularProgressView(
                    progress: Double(summary.takenToday) / Double(max(summary.totalSupplements, 1)),
                    lineWidth: 4
                )
                .frame(width: 40, height: 40)
            }
            
            if summary.missedToday > 0 {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("\(summary.missedToday) still needed")
                        .font(.caption)
                        .foregroundColor(.orange)
                    Spacer()
                }
            }
            
            NavigationLink(destination: SupplementTrackerView()) {
                HStack {
                    Image(systemName: "pills.fill")
                    Text("Manage Supplements")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.purple)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
    
    private func puqeScoreCard(_ score: PUQEScore) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("PUQE Score")
                        .font(.headline)
                    HStack(spacing: 4) {
                        Text("\(score.totalScore)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(score.severity.color)
                        Text("(\(score.severity.rawValue))")
                            .font(.caption)
                            .foregroundColor(score.severity.color)
                    }
                }
                
                Spacer()
                
                if score.severity == .moderate || score.severity == .severe {
                    NavigationLink(destination: PUQEFoodSuggestionsView(puqeScore: score)) {
                        HStack {
                            Image(systemName: "lightbulb.fill")
                            Text("Get Suggestions")
                        }
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                }
            }
            
            NavigationLink(destination: PUQEScoreView()) {
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("Update PUQE Score")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.bordered)
            .tint(score.severity.color)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
    
    private var foodCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Food Intake")
                        .font(.headline)
                    Text("\(todaysFoodCount) meals today")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "fork.knife")
                    .font(.title)
                    .foregroundColor(.orange)
            }

            Button(action: {
                showingPhotoOptions = true
            }) {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Add Photo")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)

            Button(action: {
                logsManager.logFood(notes: "Quick food log", source: .manual)
            }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Quick Log Meal")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.bordered)
            .tint(.orange)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }

    private var weightTrackingCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weight Tracking")
                        .font(.headline)
                    if let weight = currentWeight {
                        Text(healthKitManager.formatWeight(weight))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else if healthKitManager.isAuthorized {
                        Text("No weight data")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Connect to Apple Health")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "figure.stand")
                    .font(.title)
                    .foregroundColor(.pink)
            }

            if healthKitManager.isAuthorized {
                NavigationLink(destination: WeightTrackingView()) {
                    HStack {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                        Text("View Weight Trend")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                }
                .buttonStyle(.borderedProminent)
                .tint(.pink)
            } else {
                Button(action: {
                    Task {
                        await requestHealthKitAuthorization()
                    }
                }) {
                    HStack {
                        Image(systemName: "heart.circle.fill")
                        Text("Connect Apple Health")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                }
                .buttonStyle(.borderedProminent)
                .tint(.pink)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
        .task {
            if healthKitManager.isAuthorized {
                await fetchCurrentWeight()
            }
        }
    }
    
    private var recentActivitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            recentActivityHeader
            recentActivityContent
        }
    }
    
    private var recentActivityHeader: some View {
        HStack {
            Text("Recent Activity")
                .font(.headline)
            Spacer()
            NavigationLink(destination: LogLedgerView(logsManager: logsManager)) {
                Text("See All")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
        }
        .padding(.horizontal, 4)
    }
    
    private var recentActivityContent: some View {
        Group {
            if logsManager.getTodayLogs().isEmpty {
                // iOS 26 ContentUnavailableView for empty state
                ContentUnavailableView {
                    Label("No Recent Activity", systemImage: "clock.arrow.circlepath")
                } description: {
                    Text("Your recent activities will appear here")
                        .font(.subheadline)
                } actions: {
                    HStack(spacing: 12) {
                        Button {
                            logsManager.logWater(amount: 250, unit: "ml", source: .manual)
                        } label: {
                            Label("Log Water", systemImage: "drop.fill")
                                .font(.caption)
                        }
                        .buttonStyle(.bordered)
                        .tint(.blue)

                        Button {
                            logsManager.logFood(notes: "Quick food log", source: .manual)
                        } label: {
                            Label("Log Food", systemImage: "fork.knife")
                                .font(.caption)
                        }
                        .buttonStyle(.bordered)
                        .tint(.orange)
                    }
                }
                .frame(height: 200)
                .background(Color(.systemBackground))
                .cornerRadius(12)
            } else {
                List {
                    ForEach(Array(logsManager.getTodayLogs().prefix(5))) { log in
                        LogEntryRow(entry: log, showRelated: false, logsManager: logsManager)
                            .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
                            .listRowBackground(Color.clear)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    withAnimation(.smooth) {
                                        logsManager.deleteLog(log)
                                    }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                            .contextMenu {
                                Button(role: .destructive) {
                                    withAnimation(.smooth) {
                                        logsManager.deleteLog(log)
                                    }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
                .listStyle(.plain)
                .frame(height: CGFloat(min(logsManager.getTodayLogs().prefix(5).count, 5)) * 85)
                .scrollDisabled(true)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .animation(.smooth, value: logsManager.getTodayLogs().count)
            }
        }
    }
    
    private func getTimeOfDay() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12:
            return "Morning"
        case 12..<17:
            return "Afternoon"
        default:
            return "Evening"
        }
    }
    
    // MARK: - Voice Interaction Handler

    private func handleVoiceTap() {
        // Check API key
        if !openAIManager.hasAPIKey {
            withAnimation(.spring(response: 0.3)) {
                showAPIKeyError = true
            }
            // Auto-dismiss after 4 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                withAnimation {
                    showAPIKeyError = false
                }
            }
            return
        }

        // Toggle recording
        if voiceLogManager.isRecording {
            voiceLogManager.stopRecording()
        } else {
            voiceLogManager.startRecording()
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: voiceLogManager.isRecording ? .medium : .light)
        impactFeedback.impactOccurred()
    }

    // MARK: - HealthKit Integration

    private func requestHealthKitAuthorization() async {
        isLoadingWeight = true

        do {
            _ = try await healthKitManager.requestAuthorization()
            if healthKitManager.isAuthorized {
                await fetchCurrentWeight()
            }
        } catch {
            print("Failed to authorize HealthKit: \(error)")
        }

        isLoadingWeight = false
    }

    private func fetchCurrentWeight() async {
        isLoadingWeight = true

        do {
            currentWeight = try await healthKitManager.fetchLatestWeight()
        } catch {
            print("Failed to fetch weight: \(error)")
        }

        isLoadingWeight = false
    }

    // MARK: - Pregnancy Setup Card

    private var pregnancySetupCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Pregnancy Tracking")
                        .font(.headline)
                    Text("Track your pregnancy journey")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: "heart.circle.fill")
                    .font(.title)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.pink, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }

            Button {
                showingPregnancyDateEntry = true
            } label: {
                HStack {
                    Image(systemName: "calendar.badge.plus")
                    Text("Set Up Pregnancy Tracking")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.pink)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.pink.opacity(0.1),
                                    Color.purple.opacity(0.05)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}

// MARK: - API Key Error Banner
struct APIKeyErrorBanner: View {
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.title3)
                .foregroundStyle(.orange)

            VStack(alignment: .leading, spacing: 2) {
                Text("API Key Required")
                    .font(.subheadline.weight(.semibold))
                Text("Add OpenAI key in Settings to use voice features")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                onDismiss()
                // TODO: Navigate to settings
            } label: {
                Text("Settings")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.blue)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 10, y: 5)
        .padding(.horizontal)
        .padding(.top, 8)
    }
}

// MARK: - Photo Processing Extension
extension DashboardView {
    private var photoProcessingCard: some View {
        HStack(spacing: 16) {
            Image(systemName: photoProcessingProgress.icon)
                .font(.title2)
                .foregroundColor(photoProcessingProgress.color)
                .symbolEffect(.pulse, isActive: isProcessingPhoto)

            VStack(alignment: .leading, spacing: 4) {
                Text("Processing Photo")
                    .font(.headline)
                Text(photoProcessingProgress.message)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if photoProcessingProgress == .complete {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.title2)
            } else {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
        .transition(.asymmetric(
            insertion: .move(edge: .top).combined(with: .opacity),
            removal: .move(edge: .top).combined(with: .opacity)
        ))
    }

    private func savePhotoLog() {
        guard let data = tempImageData else { return }

        isProcessingPhoto = true
        photoProcessingProgress = .uploading
        showingAddNotes = false

        photoLogManager.addPhotoLog(
            imageData: data,
            notes: notes,
            mealType: selectedMealType,
            date: selectedDate
        )

        let logId = UUID()
        let initialLog = LogEntry(
            id: logId,
            date: selectedDate,
            type: .food,
            source: .manual,
            notes: notes.isEmpty ? "Analyzing photo..." : notes,
            foodName: "Processing..."
        )
        logsManager.logEntries.append(initialLog)
        logsManager.saveLogs()

        Task {
            do {
                await MainActor.run {
                    photoProcessingProgress = .analyzing
                }

                let analysis = try await OpenAIManager.shared.analyzeFood(imageData: data)

                await MainActor.run {
                    photoProcessingProgress = .recognized
                }

                let totalCalories = analysis.totalCalories ?? 0
                let totalProtein = Int(analysis.totalProtein ?? 0)
                let totalCarbs = Int(analysis.totalCarbs ?? 0)
                let totalFat = Int(analysis.totalFat ?? 0)

                let foodNames = analysis.items.map { $0.name }.joined(separator: ", ")
                let finalNotes = notes.isEmpty ? "Photo: \(foodNames)" : "\(notes)\nDetected: \(foodNames)"

                await MainActor.run {
                    if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
                        logsManager.logEntries[index].notes = finalNotes
                        logsManager.logEntries[index].foodName = foodNames
                        logsManager.logEntries[index].calories = totalCalories
                        logsManager.logEntries[index].protein = totalProtein
                        logsManager.logEntries[index].carbs = totalCarbs
                        logsManager.logEntries[index].fat = totalFat
                        logsManager.saveLogs()
                        logsManager.objectWillChange.send()
                    }

                    photoProcessingProgress = .complete

                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        isProcessingPhoto = false
                        photoProcessingProgress = .none
                    }
                }
            } catch {
                await MainActor.run {
                    if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
                        logsManager.logEntries[index].notes = notes.isEmpty ? "Photo logged (AI analysis failed)" : notes
                        logsManager.logEntries[index].foodName = "Photo logged"
                        logsManager.saveLogs()
                        logsManager.objectWillChange.send()
                    }

                    photoProcessingProgress = .complete
                    isProcessingPhoto = false
                }
                print("Failed to analyze photo: \(error)")
            }
        }

        tempImageData = nil
        notes = ""
        selectedMealType = nil
        selectedDate = Date()
    }
}

struct ActionSuccessCard: View {
    let action: VoiceAction
    @State private var isVisible = false
    
    var body: some View {
        HStack(spacing: 8) {
            // Icon
            Image(systemName: actionIcon)
                .font(.system(size: 16))
                .foregroundColor(actionColor)
                .frame(width: 32, height: 32)
                .background(
                    Circle()
                        .fill(actionColor.opacity(0.15))
                )
            
            // Content
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(actionTitle)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    // Show time if different from current
                    if let timeText = parsedTimeText {
                        Text("•")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        HStack(spacing: 2) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(timeText)
                                .font(.caption2)
                        }
                        .foregroundColor(.orange)
                    }
                }
                
                if let detail = actionDetail {
                    Text(detail)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Success checkmark
            Image(systemName: "checkmark")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.green)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 3, x: 0, y: 1)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(actionColor.opacity(0.2), lineWidth: 1)
        )
        .scaleEffect(isVisible ? 1 : 0.8)
        .opacity(isVisible ? 1 : 0)
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
                isVisible = true
            }
        }
    }
    
    private var actionIcon: String {
        switch action.type {
        case .logFood:
            return "fork.knife"
        case .logWater:
            return "drop.fill"
        case .logVitamin:
            return "pills.fill"
        case .addVitamin:
            return "plus.circle.fill"
        case .logSymptom:
            return "heart.text.square"
        case .logPUQE:
            return "chart.line.uptrend.xyaxis"
        case .unknown:
            return "questionmark.circle"
        }
    }
    
    private var actionColor: Color {
        switch action.type {
        case .logFood:
            return .orange
        case .logWater:
            return .blue
        case .logVitamin:
            return .green
        case .addVitamin:
            return .mint
        case .logSymptom:
            return .purple
        case .logPUQE:
            return .pink
        case .unknown:
            return .gray
        }
    }
    
    private var actionTitle: String {
        switch action.type {
        case .logFood:
            return action.details.item ?? "Food"
        case .logWater:
            if let amount = action.details.amount, let unit = action.details.unit {
                return "\(amount) \(unit) water"
            }
            return "Water"
        case .logVitamin:
            return action.details.vitaminName ?? action.details.item ?? "Supplement"
        case .addVitamin:
            return action.details.vitaminName ?? "New Supplement"
        case .logSymptom:
            return "Symptoms"
        case .logPUQE:
            return "PUQE Score"
        case .unknown:
            return "Unknown"
        }
    }
    
    private var actionDetail: String? {
        switch action.type {
        case .logFood:
            if let mealType = action.details.mealType {
                return mealType.capitalized
            }
            return nil
        case .logSymptom:
            if let symptoms = action.details.symptoms {
                return symptoms.joined(separator: ", ")
            }
            return nil
        default:
            return nil
        }
    }
    
    private var parsedTimeText: String? {
        guard let timestampString = action.details.timestamp else { return nil }
        
        // Parse the timestamp
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let parsedDate = formatter.date(from: timestampString) else {
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let parsedDate = formatter.date(from: timestampString) else {
                return nil
            }
            return formatTimeForDisplay(parsedDate)
        }
        
        return formatTimeForDisplay(parsedDate)
    }
    
    private func formatTimeForDisplay(_ date: Date) -> String? {
        let calendar = Calendar.current
        let now = Date()
        
        // If it's within 5 minutes of now, don't show time
        if abs(date.timeIntervalSince(now)) < 300 {
            return nil
        }
        
        // Check if it's today
        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        }
        
        // Check if it's yesterday
        if calendar.isDateInYesterday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return "Yesterday \(formatter.string(from: date))"
        }
        
        // Otherwise show date and time
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }
}

struct RecentActivityRow: View {
    let log: LogEntry
    let formatTime: (Date) -> String
    
    var body: some View {
        HStack {
            Image(systemName: log.type == .water ? "drop.fill" : "fork.knife")
                .foregroundColor(log.type == .water ? .blue : .orange)
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(log.type == .water ? "Water" : "Food")
                    .font(.subheadline)
                    .fontWeight(.medium)
                if let notes = log.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            Text(formatTime(log.date))
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}

struct MacroView: View {
    let label: String
    let value: Int
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)\(unit)")
                .font(.headline)
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}


struct VoiceRecordingView: View {
    @ObservedObject var manager: VoiceLogManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Spacer()
                
                Image(systemName: "mic.circle.fill")
                    .font(.system(size: 100))
                    .foregroundColor(.orange)
                
                Text("Voice Recording")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("Tap to start recording")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button(action: {
                    dismiss()
                }) {
                    Text("Cancel")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(10)
                }
                .padding(.horizontal)
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
}

#Preview {
    let nm = NotificationManager()
    return DashboardView()
        .environmentObject(LogsManager(notificationManager: nm))
        .environmentObject(nm)
}