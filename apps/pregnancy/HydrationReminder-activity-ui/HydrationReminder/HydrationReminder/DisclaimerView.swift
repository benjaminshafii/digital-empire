import SwiftUI

struct DisclaimerView: View {
    @Binding var isPresented: Bool
    @State private var hasScrolledToBottom = false
    @State private var hasAccepted = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(alignment: .leading, spacing: 20) {
                                VStack(spacing: 12) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 50))
                                        .foregroundColor(.orange)
                                    
                                    Text("Important Medical Disclaimer")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.top, 20)
                                
                                VStack(alignment: .leading, spacing: 16) {
                                    disclaimerSection(
                                        title: "Not a Medical Device",
                                        text: "Corgina is a wellness tracker designed to help you log and track your pregnancy journey. This app is NOT intended to diagnose, treat, cure, or prevent any disease or medical condition."
                                    )
                                    
                                    disclaimerSection(
                                        title: "Consult Healthcare Professionals",
                                        text: "Always consult your doctor, midwife, or other qualified healthcare provider for medical advice, diagnosis, and treatment. Never disregard professional medical advice or delay seeking it because of information from this app."
                                    )
                                    
                                    disclaimerSection(
                                        title: "Emergency Situations",
                                        text: "If you experience a medical emergency, call emergency services immediately. Do not rely on this app for emergency medical assistance."
                                    )
                                    
                                    disclaimerSection(
                                        title: "Information Accuracy",
                                        text: "While we strive for accuracy, this app provides general information only. Your individual health circumstances may vary. Information in this app should not replace consultations with your healthcare team."
                                    )
                                    
                                    disclaimerSection(
                                        title: "Your Responsibility",
                                        text: "By using Corgina, you acknowledge that you understand this is a wellness tracking tool only, and you take full responsibility for your health decisions in consultation with qualified medical professionals."
                                    )
                                }
                                .padding(.horizontal)
                                
                                Color.clear
                                    .frame(height: 1)
                                    .id("bottom")
                            }
                            .padding(.bottom, 100)
                        }
                        .onChange(of: hasScrolledToBottom) {
                            withAnimation {
                                proxy.scrollTo("bottom", anchor: .bottom)
                            }
                        }
                    }
                    
                    VStack(spacing: 12) {
                        Toggle(isOn: $hasAccepted) {
                            Text("I understand and agree to this disclaimer")
                                .font(.subheadline)
                        }
                        .padding(.horizontal)
                        
                        Button(action: {
                            UserDefaults.standard.set(true, forKey: "hasAcceptedDisclaimer")
                            isPresented = false
                        }) {
                            Text("Continue")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(hasAccepted ? Color.blue : Color.gray)
                                .cornerRadius(12)
                        }
                        .disabled(!hasAccepted)
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 16)
                    .background(
                        Color(UIColor.systemBackground)
                            .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: -2)
                    )
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .interactiveDismissDisabled()
    }
    
    private func disclaimerSection(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.blue)
                Text(title)
                    .font(.headline)
            }
            
            Text(text)
                .font(.body)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}

#Preview {
    DisclaimerView(isPresented: .constant(true))
}
