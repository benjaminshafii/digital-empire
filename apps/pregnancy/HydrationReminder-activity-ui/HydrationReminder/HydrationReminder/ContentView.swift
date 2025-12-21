import SwiftUI

struct ContentView: View {
    @EnvironmentObject var notificationManager: NotificationManager
    @EnvironmentObject var logsManager: LogsManager
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var showingSettings = false
    
    let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    func timeSinceString(from date: Date?) -> String {
        guard let date = date else { return "Not logged today" }
        let interval = Date().timeIntervalSince(date)
        let hours = Int(interval / 3600)
        let minutes = Int((interval.truncatingRemainder(dividingBy: 3600)) / 60)
        
        if hours > 0 {
            return "\(hours)h \(minutes)m ago"
        } else {
            return "\(minutes)m ago"
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 25) {
                    
                    VStack(spacing: 20) {
                        Text("Next Reminders")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        HStack(spacing: 20) {
                            if notificationManager.eatingEnabled, let nextTime = notificationManager.nextEatingNotification {
                                VStack(spacing: 8) {
                                    Image(systemName: "bell.fill")
                                        .foregroundColor(.orange)
                                    Text("Meal")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                    Text(nextTime, formatter: timeFormatter)
                                        .font(.title3)
                                        .fontWeight(.bold)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.orange.opacity(0.1))
                                .cornerRadius(12)
                            }
                            
                            if notificationManager.drinkingEnabled, let nextTime = notificationManager.nextDrinkingNotification {
                                VStack(spacing: 8) {
                                    Image(systemName: "bell.fill")
                                        .foregroundColor(.blue)
                                    Text("Water")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                    Text(nextTime, formatter: timeFormatter)
                                        .font(.title3)
                                        .fontWeight(.bold)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(12)
                            }
                        }
                        
                        if !notificationManager.eatingEnabled && !notificationManager.drinkingEnabled {
                            Text("No reminders active")
                                .foregroundColor(.secondary)
                                .padding()
                        }
                    }
                    
                    Divider()
                        .padding(.vertical, 10)
                    
                    VStack(spacing: 15) {
                        HStack {
                            Image(systemName: "clock.fill")
                                .foregroundColor(.purple)
                            Text("Start Hour: \(notificationManager.startHour):00")
                                .font(.subheadline)
                            Spacer()
                            Picker("", selection: $notificationManager.startHour) {
                                ForEach(0..<24) { hour in
                                    Text("\(hour):00").tag(hour)
                                }
                            }
                            .pickerStyle(.menu)
                            .accentColor(.purple)
                        }
                        .padding()
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(12)
                    }
                    
                    VStack(spacing: 15) {
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "fork.knife")
                                    .foregroundColor(.orange)
                                Text("Meal Interval")
                                Spacer()
                                HStack {
                                    TextField("", value: $notificationManager.eatingInterval, format: .number)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                        .frame(width: 50)
                                        .multilineTextAlignment(.center)
                                        .keyboardType(.decimalPad)
                                    Text("hours")
                                        .font(.subheadline)
                                }
                            }
                            
                            Toggle("Enable Reminders", isOn: Binding(
                                get: { notificationManager.eatingEnabled },
                                set: { newValue in
                                    if newValue {
                                        notificationManager.checkPermission { status in
                                            if status == .authorized || status == .provisional {
                                                notificationManager.enableEatingReminders()
                                            } else if status == .denied {
                                                alertMessage = "Please enable notifications in Settings"
                                                showingAlert = true
                                            } else {
                                                notificationManager.requestPermission()
                                                alertMessage = "Please allow notifications"
                                                showingAlert = true
                                            }
                                        }
                                    } else {
                                        notificationManager.disableEatingReminders()
                                    }
                                }
                            ))
                            .tint(.orange)
                        }
                        .padding()
                        .background(Color.orange.opacity(0.05))
                        .cornerRadius(12)
                        
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "drop.fill")
                                    .foregroundColor(.blue)
                                Text("Water Interval")
                                Spacer()
                                HStack {
                                    TextField("", value: $notificationManager.drinkingInterval, format: .number)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                        .frame(width: 50)
                                        .multilineTextAlignment(.center)
                                        .keyboardType(.decimalPad)
                                    Text("hours")
                                        .font(.subheadline)
                                }
                            }
                            
                            Toggle("Enable Reminders", isOn: Binding(
                                get: { notificationManager.drinkingEnabled },
                                set: { newValue in
                                    if newValue {
                                        notificationManager.checkPermission { status in
                                            if status == .authorized || status == .provisional {
                                                notificationManager.enableDrinkingReminders()
                                            } else if status == .denied {
                                                alertMessage = "Please enable notifications in Settings"
                                                showingAlert = true
                                            } else {
                                                notificationManager.requestPermission()
                                                alertMessage = "Please allow notifications"
                                                showingAlert = true
                                            }
                                        }
                                    } else {
                                        notificationManager.disableDrinkingReminders()
                                    }
                                }
                            ))
                            .tint(.blue)
                        }
                        .padding()
                        .background(Color.blue.opacity(0.05))
                        .cornerRadius(12)
                    }
                    
                    HStack(spacing: 15) {
                        Button("Quick: 4h Meals") {
                            notificationManager.eatingInterval = 4
                            if notificationManager.eatingEnabled {
                                notificationManager.rescheduleAllNotifications()
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        
                        Button("Quick: 1h Water") {
                            notificationManager.drinkingInterval = 1
                            if notificationManager.drinkingEnabled {
                                notificationManager.rescheduleAllNotifications()
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        
                        Button("Quick: 2h Water") {
                            notificationManager.drinkingInterval = 2
                            if notificationManager.drinkingEnabled {
                                notificationManager.rescheduleAllNotifications()
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    
                    Spacer(minLength: 30)
                }
                .padding(20)
            }
            .navigationTitle("Reminders")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                notificationManager.requestPermission()
            }
            .alert("", isPresented: $showingAlert) {
                if alertMessage.contains("Settings") {
                    Button("Open Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }
                    Button("Cancel", role: .cancel) { }
                } else {
                    Button("OK", role: .cancel) { }
                }
            } message: {
                Text(alertMessage)
            }

        }
    }
    }

#Preview {
    ContentView()
        .environmentObject(NotificationManager())
        .environmentObject(LogsManager(notificationManager: NotificationManager()))
}
