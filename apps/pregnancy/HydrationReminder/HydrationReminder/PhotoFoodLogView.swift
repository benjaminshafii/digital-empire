import SwiftUI
import PhotosUI

struct PhotoFoodLogView: View {
    @StateObject private var photoLogManager = PhotoFoodLogManager()
    @EnvironmentObject var logsManager: LogsManager
    @State private var selectedItem: PhotosPickerItem?
    @State private var showingCamera = false
    @State private var capturedImage: UIImage?
    @State private var showingAddNotes = false
    @State private var tempImageData: Data?
    @State private var notes = ""
    @State private var selectedMealType: MealType?
    @State private var selectedLog: PhotoFoodLog?
    @State private var showingDetail = false
    @State private var selectedDate = Date()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    addPhotoSection
                    
                    if !photoLogManager.getLogsForToday().isEmpty {
                        todaysLogsSection
                    }
                    
                    if !olderLogs.isEmpty {
                        previousLogsSection
                    }
                }
                .padding()
            }
            .navigationTitle("Food Photo Log")
            .sheet(isPresented: $showingCamera) {
                CameraView(image: $capturedImage)
                    .onDisappear {
                        if let image = capturedImage,
                           let data = image.jpegData(compressionQuality: 0.8) {
                            tempImageData = data
                            showingAddNotes = true
                        }
                        // Always reset capturedImage to allow re-firing
                        capturedImage = nil
                    }
            }
            .sheet(isPresented: $showingAddNotes) {
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
            .sheet(isPresented: $showingDetail) {
                if let log = selectedLog {
                    PhotoDetailView(logId: log.id, manager: photoLogManager)
                }
            }
            .onChange(of: selectedItem) { oldValue, newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self) {
                        tempImageData = data
                        showingAddNotes = true
                    }
                    // Reset selectedItem to allow selecting the same photo again
                    await MainActor.run {
                        selectedItem = nil
                    }
                }
            }
        }
    }
    
    private var addPhotoSection: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Button(action: { showingCamera = true }) {
                    Label("Take Photo", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                
                PhotosPicker(
                    selection: $selectedItem,
                    matching: .images,
                    photoLibrary: .shared()
                ) {
                    Label("Choose Photo", systemImage: "photo.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
            }
        }
    }
    
    private var todaysLogsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Meals")
                .font(.headline)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(photoLogManager.getLogsForToday()) { log in
                    PhotoThumbnail(log: log) {
                        selectedLog = log
                        showingDetail = true
                    }
                }
            }
        }
    }
    
    private var previousLogsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Previous Meals")
                .font(.headline)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(olderLogs) { log in
                    PhotoThumbnail(log: log) {
                        selectedLog = log
                        showingDetail = true
                    }
                }
            }
        }
    }
    
    private var olderLogs: [PhotoFoodLog] {
        let calendar = Calendar.current
        return photoLogManager.photoLogs.filter { !calendar.isDateInToday($0.date) }
    }
    
    private func savePhotoLog() {
        if let data = tempImageData {
            photoLogManager.addPhotoLog(
                imageData: data,
                notes: notes,
                mealType: selectedMealType,
                date: selectedDate
            )
            
            logsManager.logFood(
                notes: notes.isEmpty ? "Photo logged" : notes,
                source: .manual
            )
            
            showingAddNotes = false
            tempImageData = nil
            notes = ""
            selectedMealType = nil
            selectedDate = Date()
        }
    }
}

struct PhotoThumbnail: View {
    let log: PhotoFoodLog
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 4) {
                ZStack(alignment: .topTrailing) {
                    if let image = log.image {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 150)
                            .clipped()
                            .cornerRadius(8)
                    }
                    
                    if log.isEnriched {
                        HStack(spacing: 4) {
                            Image(systemName: "sparkles")
                                .font(.caption2)
                            if let calories = log.aiAnalysis?.totalCalories {
                                Text("\(calories) cal")
                                    .font(.caption2)
                                    .fontWeight(.semibold)
                            }
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.purple.opacity(0.9))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                        .padding(4)
                    }
                }
                
                HStack {
                    if let mealType = log.mealType {
                        Image(systemName: mealType.icon)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Text(formatTime(log.date))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 4)
                
                if let notes = log.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption2)
                        .lineLimit(2)
                        .foregroundColor(.primary)
                        .padding(.horizontal, 4)
                }
            }
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            formatter.timeStyle = .short
        } else {
            formatter.dateStyle = .short
            formatter.timeStyle = .short
        }
        return formatter.string(from: date)
    }
}

struct AddNotesView: View {
    @Binding var imageData: Data?
    @Binding var notes: String
    @Binding var mealType: MealType?
    @Binding var selectedDate: Date
    let onSave: () -> Void
    let onCancel: () -> Void
    @State private var showDatePicker = false
    
    var body: some View {
        NavigationView {
            Form {
                if let data = imageData, let image = UIImage(data: data) {
                    Section {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxHeight: 300)
                    }
                }
                
                Section(header: Text("Date & Time")) {
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(.secondary)
                        Text("Date")
                        Spacer()
                        Text(formatDate(selectedDate))
                            .foregroundColor(.secondary)
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        showDatePicker.toggle()
                    }
                    
                    if showDatePicker {
                        DatePicker(
                            "Select Date",
                            selection: $selectedDate,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                        .datePickerStyle(WheelDatePickerStyle())
                        .labelsHidden()
                    }
                }
                
                Section(header: Text("Meal Type")) {
                    Picker("Type", selection: $mealType) {
                        Text("None").tag(nil as MealType?)
                        ForEach(MealType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon).tag(type as MealType?)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section(header: Text("Notes (Optional)")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 100)
                }
            }
            .navigationTitle("Add Food Details")
            .navigationBarItems(
                leading: Button("Cancel", action: onCancel),
                trailing: Button("Save", action: onSave)
                    .fontWeight(.semibold)
            )
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct PhotoDetailView: View {
    let logId: UUID
    @ObservedObject var manager: PhotoFoodLogManager
    @StateObject private var openAIManager = OpenAIManager.shared
    @Environment(\.dismiss) var dismiss
    @State private var showingEdit = false
    @State private var editNotes = ""
    @State private var editMealType: MealType?
    @State private var editDate = Date()
    @State private var isEnriching = false
    @State private var enrichError: String?
    @State private var showingError = false
    @State private var showEditDatePicker = false
    
    var log: PhotoFoodLog? {
        manager.photoLogs.first { $0.id == logId }
    }
    
    var body: some View {
        NavigationView {
            if let log = log {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let image = log.image {
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .cornerRadius(12)
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                if let mealType = log.mealType {
                                    Label(mealType.rawValue, systemImage: mealType.icon)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Text(log.formattedDate)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            
                            if let notes = log.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.body)
                                    .padding(.top, 4)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(10)
                        
                        if openAIManager.hasAPIKey && !log.isEnriched {
                        Button(action: enrichImage) {
                            HStack {
                                if isEnriching {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle())
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "sparkles")
                                }
                                Text(isEnriching ? "Analyzing..." : "Enrich with AI")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(LinearGradient(
                                colors: [Color.purple, Color.blue],
                                startPoint: .leading,
                                endPoint: .trailing
                            ))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                        .disabled(isEnriching)
                        }
                        
                        if log.isEnriched, let analysis = log.aiAnalysis {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "sparkles")
                                    .foregroundColor(.purple)
                                Text("AI Analysis")
                                    .font(.headline)
                                Spacer()
                                if let enrichedDate = log.enrichedDate {
                                    Text(enrichedDate, style: .relative)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            if let totalCalories = analysis.totalCalories {
                                HStack {
                                    Image(systemName: "flame.fill")
                                        .foregroundColor(.orange)
                                    Text("\(totalCalories) calories")
                                        .font(.title3)
                                        .fontWeight(.semibold)
                                }
                            }
                            
                            HStack(spacing: 16) {
                                if let protein = analysis.totalProtein {
                                    VStack {
                                        Text("\(Int(protein))g")
                                            .font(.headline)
                                        Text("Protein")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                
                                if let carbs = analysis.totalCarbs {
                                    VStack {
                                        Text("\(Int(carbs))g")
                                            .font(.headline)
                                        Text("Carbs")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                
                                if let fat = analysis.totalFat {
                                    VStack {
                                        Text("\(Int(fat))g")
                                            .font(.headline)
                                        Text("Fat")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                
                                if let fiber = analysis.totalFiber {
                                    VStack {
                                        Text("\(Int(fiber))g")
                                            .font(.headline)
                                        Text("Fiber")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            
                            Divider()
                            
                            Text("Food Items")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            ForEach(analysis.items, id: \.name) { item in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(item.name)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                        Spacer()
                                        Text(item.quantity)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    if let calories = item.estimatedCalories {
                                        Text("\(calories) cal")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    HStack(spacing: 12) {
                                        if let p = item.protein {
                                            Text("P: \(Int(p))g")
                                                .font(.caption2)
                                        }
                                        if let c = item.carbs {
                                            Text("C: \(Int(c))g")
                                                .font(.caption2)
                                        }
                                        if let f = item.fat {
                                            Text("F: \(Int(f))g")
                                                .font(.caption2)
                                        }
                                    }
                                    .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(10)
                    }
                    }
                    .padding()
                }
                .navigationTitle("Food Photo")
                .navigationBarItems(
                    leading: Button("Done") { dismiss() },
                    trailing: Menu {
                            Button(action: { 
                                editNotes = log.notes ?? ""
                                editMealType = log.mealType
                                editDate = log.date
                                showingEdit = true 
                            }) {
                                Label("Edit", systemImage: "pencil")
                            }
                            Button(role: .destructive, action: {
                                manager.deletePhotoLog(log)
                                dismiss()
                            }) {
                                Label("Delete", systemImage: "trash")
                            }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                )
                .alert("Error", isPresented: $showingError) {
                    Button("OK", role: .cancel) { }
                } message: {
                    Text(enrichError ?? "Unknown error occurred")
                }
                .sheet(isPresented: $showingEdit) {
                    NavigationView {
                        Form {
                            Section(header: Text("Date & Time")) {
                                HStack {
                                    Image(systemName: "calendar")
                                        .foregroundColor(.secondary)
                                    Text("Date")
                                    Spacer()
                                    Text(formatEditDate(editDate))
                                        .foregroundColor(.secondary)
                                }
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    showEditDatePicker.toggle()
                                }
                                
                                if showEditDatePicker {
                                    DatePicker(
                                        "Select Date",
                                        selection: $editDate,
                                        displayedComponents: [.date, .hourAndMinute]
                                    )
                                    .datePickerStyle(WheelDatePickerStyle())
                                    .labelsHidden()
                                }
                            }
                            
                            Section(header: Text("Meal Type")) {
                                Picker("Type", selection: $editMealType) {
                                    Text("None").tag(nil as MealType?)
                                    ForEach(MealType.allCases, id: \.self) { type in
                                        Label(type.rawValue, systemImage: type.icon).tag(type as MealType?)
                                    }
                                }
                                .pickerStyle(SegmentedPickerStyle())
                            }
                            
                            Section(header: Text("Notes")) {
                                TextEditor(text: $editNotes)
                                    .frame(minHeight: 100)
                            }
                        }
                        .navigationTitle("Edit Details")
                        .navigationBarItems(
                            leading: Button("Cancel") { 
                                showingEdit = false
                                showEditDatePicker = false
                            },
                            trailing: Button("Save") {
                                manager.updatePhotoLog(log, notes: editNotes, mealType: editMealType, date: editDate)
                                showingEdit = false
                                showEditDatePicker = false
                            }
                        )
                    }
                }
            } else {
                Text("Photo not found")
                    .navigationTitle("Food Photo")
                    .navigationBarItems(leading: Button("Done") { dismiss() })
            }
        }
    }
    
    private func enrichImage() {
        guard let log = log else { return }
        Task {
            isEnriching = true
            do {
                let analysis = try await openAIManager.analyzeFood(imageData: log.imageData)
                await MainActor.run {
                    manager.enrichPhotoLog(log, with: analysis)
                }
            } catch {
                await MainActor.run {
                    enrichError = error.localizedDescription
                    showingError = true
                }
            }
            await MainActor.run {
                isEnriching = false
            }
        }
    }
    
    private func formatEditDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct CameraView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraView
        
        init(_ parent: CameraView) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let uiImage = info[.originalImage] as? UIImage {
                parent.image = uiImage
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}