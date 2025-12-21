import SwiftUI

// MARK: - Data Model
struct PregnancyFunFact: Identifiable {
    let id = UUID()
    let title: String
    let fact: String
    let source: String
    let category: FactCategory
    let icon: String
    let applicableTrimester: Int? // nil = all trimesters, 1/2/3 = specific
    let redditUsername: String? // For Reddit testimonials

    // Convenience initializer without trimester (defaults to nil = all trimesters)
    init(title: String, fact: String, source: String, category: FactCategory, icon: String, applicableTrimester: Int? = nil, redditUsername: String? = nil) {
        self.title = title
        self.fact = fact
        self.source = source
        self.category = category
        self.icon = icon
        self.applicableTrimester = applicableTrimester
        self.redditUsername = redditUsername
    }

    enum FactCategory {
        case exercise
        case nutrition
        case health
        case labor
        case mentalHealth
        case complications
        case emergency
        case awareness
        case trimester1
        case trimester2
        case trimester3
        case funFact
        case redditTestimonial

        var color: Color {
            switch self {
            case .exercise: return .green
            case .nutrition: return .orange
            case .health: return .pink
            case .labor: return .purple
            case .mentalHealth: return .indigo
            case .complications: return .red
            case .emergency: return .red
            case .awareness: return .blue
            case .trimester1: return .mint
            case .trimester2: return .teal
            case .trimester3: return .cyan
            case .funFact: return .yellow
            case .redditTestimonial: return Color(red: 1.0, green: 0.27, blue: 0.0) // Reddit orange
            }
        }
    }
}

// MARK: - Fun Facts Database
extension PregnancyFunFact {
    static let allFacts: [PregnancyFunFact] = [
        // Exercise Facts
        PregnancyFunFact(
            title: "Zone 2 Cardio is Your Best Friend",
            fact: "Moderate-intensity cardio at 60-70% max heart rate is the safest and most beneficial exercise during pregnancy. Just maintain a 'conversational pace' where you can talk but not sing.",
            source: "ACOG 2020",
            category: .exercise,
            icon: "heart.fill"
        ),

        PregnancyFunFact(
            title: "HIIT Can Be Safe (If You're Already Trained)",
            fact: "Recent research shows high-intensity exercise is safe for women who were already doing it pre-pregnancy. A 2025 meta-analysis of 16 studies found it reduces gestational diabetes risk by 55%.",
            source: "European Journal of Applied Physiology 2025",
            category: .exercise,
            icon: "bolt.fill"
        ),

        PregnancyFunFact(
            title: "Weight Training Has No Arbitrary Limits",
            fact: "The old '10-pound rule' is myth! A University of Alberta study confirmed that lifting at 70-90% of your 10-rep max is safe during pregnancy with no adverse effects on baby.",
            source: "British Journal of Sports Medicine 2023",
            category: .exercise,
            icon: "dumbbell.fill"
        ),

        PregnancyFunFact(
            title: "Exercise Cuts Diabetes Risk in Half",
            fact: "Regular exercise during pregnancy reduces your risk of gestational diabetes by 30-50%. That's better than most medications!",
            source: "ACOG 2020",
            category: .exercise,
            icon: "chart.line.downtrend.xyaxis"
        ),

        PregnancyFunFact(
            title: "Shorter, Faster Labor",
            fact: "Women who exercise regularly during pregnancy have labor that's 30-60 minutes shorter on average and 20-30% lower C-section rates.",
            source: "ACOG 2020",
            category: .labor,
            icon: "clock.arrow.circlepath"
        ),

        PregnancyFunFact(
            title: "The 150-Minute Sweet Spot",
            fact: "Just 150 minutes per week of moderate exercise (30 min × 5 days) provides massive benefits. You can even break it into 10-15 minute sessions!",
            source: "ACOG 2020",
            category: .exercise,
            icon: "timer"
        ),

        PregnancyFunFact(
            title: "Preeclampsia Protection",
            fact: "Exercise reduces your risk of preeclampsia by 30-40%. This potentially life-threatening condition affects blood pressure and organ function.",
            source: "ACOG 2020",
            category: .health,
            icon: "heart.text.square.fill"
        ),

        PregnancyFunFact(
            title: "Ditch the Heart Rate Monitor",
            fact: "The 'talk test' is more reliable than heart rate zones during pregnancy. If you can hold a conversation but not sing, you're at the perfect intensity!",
            source: "RANZCOG 2020",
            category: .exercise,
            icon: "waveform.path.ecg"
        ),

        PregnancyFunFact(
            title: "Swimming is Pregnancy Gold",
            fact: "Water supports your body weight and reduces joint stress, making swimming ideal throughout all trimesters. Plus, it helps with swelling!",
            source: "ACOG 2020",
            category: .exercise,
            icon: "figure.pool.swim"
        ),

        PregnancyFunFact(
            title: "Baby Benefits Too",
            fact: "Exercise during pregnancy improves your baby's 5-minute Apgar scores (a measure of newborn health) and may provide long-term cardiovascular benefits.",
            source: "European Journal of Applied Physiology 2025",
            category: .health,
            icon: "figure.and.child.holdinghands"
        ),

        PregnancyFunFact(
            title: "Back Pain Relief",
            fact: "Regular exercise reduces lower back pain by 25-40% during pregnancy by strengthening core muscles and improving posture.",
            source: "ACOG 2020",
            category: .health,
            icon: "figure.walk"
        ),

        PregnancyFunFact(
            title: "Mental Health Matters",
            fact: "Exercise reduces postpartum depression risk by 30-50% and improves mood throughout pregnancy by releasing endorphins and reducing stress hormones.",
            source: "ACOG 2020",
            category: .health,
            icon: "brain.head.profile"
        ),

        PregnancyFunFact(
            title: "No Lying on Your Back After 16 Weeks",
            fact: "Avoid exercises flat on your back after the first trimester to prevent compressing the vena cava (the major blood vessel). Use an incline or side-lying positions instead.",
            source: "ACOG 2020",
            category: .exercise,
            icon: "bed.double.fill"
        ),

        PregnancyFunFact(
            title: "Squats Prepare You for Labor",
            fact: "Practicing squats during pregnancy opens your pelvis, strengthens your legs, and mimics beneficial labor positions. Continue them throughout pregnancy!",
            source: "ACOG 2020",
            category: .labor,
            icon: "figure.flexibility"
        ),

        PregnancyFunFact(
            title: "Exercise is Safe for Baby",
            fact: "Extensive research confirms exercise does NOT increase risk of miscarriage, preterm birth, low birth weight, or birth defects. The benefits far outweigh any risks!",
            source: "ACOG 2020 Meta-Analysis",
            category: .health,
            icon: "checkmark.shield.fill"
        ),

        // CATEGORY 1: Health Tips & Medical Information (30%)
        // Nutrition Facts
        PregnancyFunFact(
            title: "Folic Acid is Your Baby's Best Friend",
            fact: "Taking 400-800 mcg of folic acid daily before and during early pregnancy can prevent up to 70% of neural tube defects like spina bifida. Start before conception if possible!",
            source: "CDC 2025",
            category: .nutrition,
            icon: "pills.fill"
        ),

        PregnancyFunFact(
            title: "Your Blood Volume Doubles",
            fact: "During pregnancy, your blood volume increases by 50%, which is why you need 27mg of iron daily—50% more than before pregnancy. This supports your baby's growth and brain development.",
            source: "ACOG 2025",
            category: .nutrition,
            icon: "drop.fill"
        ),

        PregnancyFunFact(
            title: "Calcium: Not Just for Milk",
            fact: "You need 1,000mg of calcium daily (1,300mg if you're 18 or younger). Adequate calcium intake reduces your risk of preeclampsia and builds your baby's bones and teeth.",
            source: "NIH 2025",
            category: .nutrition,
            icon: "bone.fill"
        ),

        PregnancyFunFact(
            title: "The Sunshine Vitamin",
            fact: "All pregnant women need 600 IU of vitamin D daily to regulate calcium and phosphate, keeping bones, teeth, and muscles healthy. Deficiency is linked to increased stretch mark risk.",
            source: "NHS 2025",
            category: .nutrition,
            icon: "sun.max.fill"
        ),

        PregnancyFunFact(
            title: "Building Blocks for Baby",
            fact: "Pregnant women need an extra 25 grams of protein daily (about 71g total) to support your baby's rapid tissue and organ growth, especially in the second and third trimesters.",
            source: "ACOG 2025",
            category: .nutrition,
            icon: "leaf.fill"
        ),

        PregnancyFunFact(
            title: "Water is Your Pregnancy Superpower",
            fact: "Drink 8-12 cups (64-96 oz) of water daily. Adequate hydration reduces your risk of UTIs, preterm labor, headaches, kidney stones, and helps maintain healthy amniotic fluid levels.",
            source: "Institute of Medicine 2025",
            category: .health,
            icon: "drop.circle.fill"
        ),

        PregnancyFunFact(
            title: "The Simple Hydration Check",
            fact: "Your urine should be pale clear or light yellow. Dark urine means you need more water. Most pregnant women don't meet hydration recommendations, with 63% lacking knowledge of proper intake.",
            source: "Tommy's 2025",
            category: .health,
            icon: "eyedropper.halffull"
        ),

        PregnancyFunFact(
            title: "More Water = Less Swelling?",
            fact: "Counterintuitively, drinking MORE water actually reduces swelling (edema). Proper hydration improves circulation and kidney function, helping your body flush out excess sodium.",
            source: "Intermountain Healthcare 2025",
            category: .health,
            icon: "water.waves"
        ),

        PregnancyFunFact(
            title: "Get Your Flu Shot Every Season",
            fact: "The flu vaccine is safe and recommended at any time during pregnancy. It protects both you and your baby for the first 6 months of life through transferred antibodies.",
            source: "CDC ACIP 2024",
            category: .health,
            icon: "syringe.fill"
        ),

        PregnancyFunFact(
            title: "Whooping Cough Protection",
            fact: "Get Tdap vaccine between weeks 27-36 of EVERY pregnancy, even if you had it before. This passes maximum protective antibodies to your baby before birth.",
            source: "CDC ACIP 2024",
            category: .health,
            icon: "shield.checkered"
        ),

        PregnancyFunFact(
            title: "Updated COVID Protection",
            fact: "COVID-19 vaccination is recommended for all pregnant women. Studies confirm it's safe and reduces severe illness risk. COVID during pregnancy increases risk of preterm birth and ICU admission.",
            source: "CDC 2024",
            category: .health,
            icon: "cross.case.fill"
        ),

        PregnancyFunFact(
            title: "Sleep on Your Left After 28 Weeks",
            fact: "Sleeping on your left side in the third trimester reduces stillbirth risk by improving blood flow to the uterus and preventing compression of the vena cava, the major vein to your heart.",
            source: "Tommy's 2025",
            category: .health,
            icon: "bed.double.fill"
        ),

        PregnancyFunFact(
            title: "Switch Sides for Comfort",
            fact: "Research shows equal safety sleeping on left or right side. Use pregnancy pillows between your knees to reduce hip pressure. Just avoid flat-back sleeping after 28 weeks.",
            source: "Sleep Foundation 2025",
            category: .health,
            icon: "moon.zzz.fill"
        ),

        PregnancyFunFact(
            title: "Your Gums Need Extra Care",
            fact: "60-75% of pregnant women develop bleeding gums due to hormonal changes making gums more vulnerable to plaque. Untreated periodontitis is linked to preterm birth and low birth weight.",
            source: "Penn Dental Medicine 2025",
            category: .health,
            icon: "mouth.fill"
        ),

        PregnancyFunFact(
            title: "Don't Skip the Dentist",
            fact: "Schedule a dental checkup while pregnant—it's completely safe! Brush twice daily with fluoride toothpaste and floss daily, even if your gums are sore. Vitamin C and calcium help gum health.",
            source: "NHS 2025",
            category: .health,
            icon: "tooth.fill"
        ),

        PregnancyFunFact(
            title: "The Weight Gain Timeline",
            fact: "Gain 1-4 lbs in the first trimester, then about 1 lb/week in the second and third trimesters (0.4 kg/week for normal BMI). You only need 340 extra calories/day in second trimester, 450 in third.",
            source: "CDC 2025",
            category: .nutrition,
            icon: "scalemass.fill"
        ),

        PregnancyFunFact(
            title: "The 'Eating for Two' Myth",
            fact: "You DON'T need to double your calories! You only need an extra 300-450 calories per day in the second and third trimesters—that's about a banana and yogurt.",
            source: "Mayo Clinic 2025",
            category: .nutrition,
            icon: "fork.knife"
        ),

        PregnancyFunFact(
            title: "Practice Kegels for Easier Birth",
            fact: "Pregnant women who do Kegel exercises often have easier births, better bladder control, and faster perineal healing. Contract pelvic muscles for 5-10 seconds, repeat 10-20 times daily.",
            source: "American Pregnancy Association 2025",
            category: .labor,
            icon: "figure.flexibility"
        ),

        // CATEGORY 2: Trimester-Specific Fun Facts (30%)
        PregnancyFunFact(
            title: "Tiny Heart, Big Beat",
            fact: "Your baby's heart begins beating at just 5 weeks—about twice the rate of your adult heart at 110-160 bpm! It will beat approximately 54 million times before birth.",
            source: "Cleveland Clinic 2025",
            category: .trimester1,
            icon: "heart.circle.fill",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "First Trimester: The Critical Period",
            fact: "The first trimester is the most crucial for development—all major organs, the brain, spine, arms, and legs form by week 12. Your baby goes from a single cell to a fully-formed tiny human!",
            source: "ACOG 2025",
            category: .trimester1,
            icon: "sparkles",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "Unique From the Start",
            fact: "Your baby develops their unique fingerprints between 9-12 weeks in the womb. At 9 weeks, they can also sigh and have started sucking their thumb!",
            source: "Unity Point Health 2025",
            category: .trimester1,
            icon: "hand.point.up.left.fill",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "Nausea Means Strong Pregnancy",
            fact: "While miserable, morning sickness (nausea/vomiting) is associated with LOWER miscarriage risk. It peaks around 9 weeks and typically improves by week 14 as hormones stabilize.",
            source: "WebMD 2025",
            category: .trimester1,
            icon: "face.dashed.fill",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "First Trimester Food Rules",
            fact: "Heat lunch meats to 165°F before eating and avoid unpasteurized soft cheeses (Brie, feta, blue cheese) to prevent listeria, which can cause miscarriage in the vulnerable first trimester.",
            source: "Johns Hopkins Medicine 2025",
            category: .trimester1,
            icon: "exclamationmark.triangle.fill",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "Keep Your Temperature Down",
            fact: "Fever in the first trimester can be harmful to fetal development. Avoid hot yoga, jacuzzis, and saunas. Call your doctor if your temperature exceeds 100.4°F.",
            source: "VCU Health 2025",
            category: .trimester1,
            icon: "thermometer.medium",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "Welcome to the Easy Weeks",
            fact: "The second trimester is called the 'golden trimester' because nausea typically disappears, energy returns, and you're not yet uncomfortable from size. Enjoy it while it lasts!",
            source: "Cleveland Clinic 2025",
            category: .trimester2,
            icon: "sun.horizon.fill",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Flavor Training Starts Now",
            fact: "At 20 weeks, your baby swallows ¾ to 3 cups of amniotic fluid daily and can taste what you eat! Flavors pass into amniotic fluid, potentially influencing their food preferences after birth.",
            source: "Unity Point Health 2025",
            category: .trimester2,
            icon: "mouth.fill",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Talk to Your Bump",
            fact: "By 23 weeks, your baby can hear your voice and distinguish it from others! By the third trimester, they'll show a favorable response to familiar voices, especially yours.",
            source: "Medical News Today 2025",
            category: .trimester2,
            icon: "waveform",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Hello, Little Kicks!",
            fact: "Most women feel their baby's first movements (quickening) around week 20. First-time moms might not notice until week 25, while experienced moms may feel it as early as 16 weeks.",
            source: "Johns Hopkins Medicine 2025",
            category: .trimester2,
            icon: "figure.mixed.cardio",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "The Big Ultrasound",
            fact: "The 20-week anatomy scan can take 45 minutes and examines all your baby's organs and structures. Doctors also screen for gestational diabetes around week 28.",
            source: "UPMC 2025",
            category: .trimester2,
            icon: "photo.fill.on.rectangle.fill",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Sharp Pains When Moving",
            fact: "Sharp, brief pains on the sides of your belly when you move are round ligament pain—totally normal in the second trimester as ligaments stretch to support your growing uterus.",
            source: "Banner Health 2025",
            category: .trimester2,
            icon: "bolt.horizontal.fill",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Let There Be Light",
            fact: "At 27 weeks, your baby's eyes open for the first time! They can distinguish between light and dark and even detect light streaming in from outside your body.",
            source: "The Bump 2025",
            category: .trimester3,
            icon: "eye.fill",
            applicableTrimester: 3
        ),

        PregnancyFunFact(
            title: "Practice Crying at 28 Weeks",
            fact: "Babies begin to cry silently in the womb as early as 28 weeks—not from distress, but to practice for the real world! They also yawn to support brain development.",
            source: "Miracare 2025",
            category: .trimester3,
            icon: "face.smiling.inverse",
            applicableTrimester: 3
        ),

        PregnancyFunFact(
            title: "The Final Countdown",
            fact: "Your baby's lungs are the last major organ to finish developing. When fully mature around 36 weeks, they produce a chemical that affects hormones in your body, helping trigger labor.",
            source: "Family Doctor 2025",
            category: .trimester3,
            icon: "wind",
            applicableTrimester: 3
        ),

        PregnancyFunFact(
            title: "False Labor Prepares You",
            fact: "Braxton Hicks 'practice contractions' typically start in the second or third trimester. Unlike real labor, they're irregular, don't intensify, and ease with position changes or hydration.",
            source: "Cleveland Clinic 2025",
            category: .trimester3,
            icon: "waveform.path.ecg",
            applicableTrimester: 3
        ),

        PregnancyFunFact(
            title: "Fully Sensory by 31 Weeks",
            fact: "By 31 weeks, your baby's five senses are largely functional! They're responsive to light, touch, sound, taste, and smell. Touch receptors are fully developed all over their body.",
            source: "Tidewater OBGYN 2025",
            category: .trimester3,
            icon: "hand.raised.fingers.spread.fill",
            applicableTrimester: 3
        ),

        PregnancyFunFact(
            title: "Final Stretch Monitoring",
            fact: "From 28-36 weeks, you'll see your provider every two weeks. After 36 weeks, it's weekly appointments to monitor your and baby's health as you approach your due date.",
            source: "Mother Baby Center 2025",
            category: .trimester3,
            icon: "calendar.badge.clock",
            applicableTrimester: 3
        ),

        // CATEGORY 3: Serious Awareness Topics (30%)
        PregnancyFunFact(
            title: "Mental Health Matters Just as Much",
            fact: "1 in 5 women and 1 in 10 men experience depression or anxiety during pregnancy or postpartum. Postpartum depression rates nearly doubled from 9.4% in 2010 to 19% in 2021.",
            source: "NIMH 2025",
            category: .mentalHealth,
            icon: "brain.head.profile"
        ),

        PregnancyFunFact(
            title: "Don't Suffer in Silence",
            fact: "Over 50% of women with postpartum depression don't get treatment due to stigma or reluctance to disclose symptoms. Depression and anxiety are common AND treatable—speak up!",
            source: "Policy Center for Maternal Mental Health 2025",
            category: .mentalHealth,
            icon: "heart.text.square.fill"
        ),

        PregnancyFunFact(
            title: "24/7 Help is Available",
            fact: "If you're struggling with mental health during or after pregnancy, call or text 1-833-TLC-MAMA (1-833-852-6262) to reach counselors 24/7. You're not alone.",
            source: "MCHB 2025",
            category: .mentalHealth,
            icon: "phone.circle.fill"
        ),

        PregnancyFunFact(
            title: "Know the Preeclampsia Symptoms",
            fact: "Preeclampsia affects 5-8% of pregnancies. Warning signs: severe headache that won't go away, vision changes, severe belly pain, sudden swelling of face/hands. Call your doctor immediately!",
            source: "CDC Hear Her Campaign 2025",
            category: .complications,
            icon: "exclamationmark.octagon.fill"
        ),

        PregnancyFunFact(
            title: "GDM Screening Around Week 28",
            fact: "Gestational diabetes affects about 10% of pregnancies. It's screened around week 28 and raises risk of preeclampsia and C-section. The good news: it's manageable with diet, exercise, and monitoring.",
            source: "Mayo Clinic 2025",
            category: .complications,
            icon: "chart.line.uptrend.xyaxis"
        ),

        PregnancyFunFact(
            title: "GDM Increases Preeclampsia Risk",
            fact: "Having gestational diabetes significantly increases your risk of developing preeclampsia. Both conditions together further increase adverse outcomes, so close monitoring is essential.",
            source: "Nature Scientific Reports 2024",
            category: .complications,
            icon: "arrow.triangle.branch"
        ),

        PregnancyFunFact(
            title: "Pregnancy Reveals Future Health",
            fact: "Women who had preeclampsia or gestational diabetes have increased risk of cardiovascular disease later in life. Use this as motivation for healthy lifestyle changes after pregnancy!",
            source: "BMC Pregnancy and Childbirth 2019",
            category: .complications,
            icon: "heart.circle.fill"
        ),

        PregnancyFunFact(
            title: "When to Call 911",
            fact: "Seek immediate care for: severe headache that won't go away, trouble breathing, chest pain, severe belly pain, heavy bleeding soaking a pad in <1 hour, thoughts of self-harm, or baby stops moving.",
            source: "CDC Hear Her Campaign 2025",
            category: .emergency,
            icon: "exclamationmark.triangle.fill"
        ),

        PregnancyFunFact(
            title: "Speak Up in Emergencies",
            fact: "When seeking emergency care, ALWAYS say you're pregnant or were pregnant in the last year. Some problems can happen up to a year after delivery, and providers need this context.",
            source: "CDC Hear Her Campaign 2025",
            category: .emergency,
            icon: "mic.fill"
        ),

        PregnancyFunFact(
            title: "If Something Feels Wrong...",
            fact: "If something doesn't feel right—even if you're not sure it's serious—contact your healthcare provider or go to the ER. Many women with severe complications didn't realize the seriousness beforehand.",
            source: "Henry Ford Health 2024",
            category: .emergency,
            icon: "hand.raised.fill"
        ),

        PregnancyFunFact(
            title: "One Cup of Coffee is Safe",
            fact: "ACOG says up to 200mg of caffeine daily is safe during pregnancy—that's about one 12-oz cup of coffee. Limit tea and caffeinated sodas too, as amounts add up quickly.",
            source: "ACOG 2025",
            category: .health,
            icon: "cup.and.saucer.fill"
        ),

        PregnancyFunFact(
            title: "Zero Alcohol is Safest",
            fact: "No amount of alcohol is proven safe during pregnancy. It can cause fetal alcohol spectrum disorders (FASDs), leading to physical, behavioral, and learning problems. Abstain completely.",
            source: "CDC 2025",
            category: .health,
            icon: "nosign"
        ),

        PregnancyFunFact(
            title: "Avoid Raising Core Temperature",
            fact: "Hot tubs and whirlpools can double your miscarriage risk, especially in the first trimester. Avoid hot yoga, saunas, and baths over 100°F—keep your core temperature below 101°F.",
            source: "UT Southwestern Medical Center 2025",
            category: .health,
            icon: "thermometer.sun.fill"
        ),

        PregnancyFunFact(
            title: "Pregnancy Brain is Science-Backed",
            fact: "50-80% of pregnant women report memory lapses. Research confirms cognitive changes, especially in the third trimester, as your brain prunes connections to become more efficient for motherhood.",
            source: "UT Southwestern Medical Center 2025",
            category: .awareness,
            icon: "brain.head.profile"
        ),

        PregnancyFunFact(
            title: "Incredible Uterine Expansion",
            fact: "By the end of pregnancy, your uterus is 500-1000 times its normal size! It grows from the size of a pear to accommodate a full-term baby, placenta, and amniotic fluid.",
            source: "Miracare 2025",
            category: .awareness,
            icon: "arrow.up.right.circle.fill"
        ),

        PregnancyFunFact(
            title: "Shoe Shopping After Pregnancy?",
            fact: "The hormone relaxin softens ligaments throughout your body, including your feet. Many women's feet flatten and grow wider during pregnancy—sometimes permanently! You may need new shoes.",
            source: "Miracare 2025",
            category: .awareness,
            icon: "figure.walk"
        ),

        PregnancyFunFact(
            title: "Stretch Marks are Normal",
            fact: "50-90% of women get stretch marks during pregnancy. No cream is scientifically proven to prevent them, but keeping skin moisturized with hyaluronic acid and centella may help minimize appearance.",
            source: "American Academy of Dermatology 2025",
            category: .awareness,
            icon: "waveform.path"
        ),

        PregnancyFunFact(
            title: "Keep Things Moving",
            fact: "Constipation is most common in the third trimester when the heavier uterus puts pressure on bowels. Combat it with 25-30g fiber daily, exercise, hydration, and probiotics.",
            source: "Cleveland Clinic 2025",
            category: .awareness,
            icon: "figure.walk.circle.fill"
        ),

        // CATEGORY 4: Random Interesting/Funny Facts (10%)
        PregnancyFunFact(
            title: "Babies Have More Bones Than You",
            fact: "Newborns are born with about 300 bones, but adults only have 206! Many bones fuse together as children grow. This makes birth easier and allows for rapid early growth.",
            source: "Unity Point Health 2025",
            category: .funFact,
            icon: "fossil.shell.fill"
        ),

        PregnancyFunFact(
            title: "Hormone Explosion",
            fact: "At full term, a pregnant woman produces more estrogen in ONE DAY than a non-pregnant woman produces in THREE YEARS. No wonder you feel different!",
            source: "Miracare 2025",
            category: .funFact,
            icon: "sparkles"
        ),

        PregnancyFunFact(
            title: "Righty or Lefty?",
            fact: "75% of babies show right-hand dominance at just 8 weeks in the womb! The other 25% show left-hand preference or no preference. They're already developing their personality!",
            source: "Pregnancy Resource Center 2025",
            category: .funFact,
            icon: "hand.thumbsup.fill"
        ),

        PregnancyFunFact(
            title: "Tears Come Later",
            fact: "Newborns can holler and scream, but can't produce actual tears until about 3 weeks of age. Their tear ducts aren't fully developed yet—but the crying is still VERY real!",
            source: "Unity Point Health 2025",
            category: .funFact,
            icon: "drop.fill"
        ),

        PregnancyFunFact(
            title: "Sympathetic Let-Down Reflex",
            fact: "In late pregnancy, some women start lactating automatically when they hear someone else's baby crying! Your body is practicing its response to baby's needs.",
            source: "Miracare 2025",
            category: .funFact,
            icon: "ear.fill"
        ),

        PregnancyFunFact(
            title: "Natal Teeth Surprise",
            fact: "About 1 in every 2,000-3,000 infants is born with one or two teeth already present (natal teeth). They're usually lower front teeth and may need removal if loose.",
            source: "Unity Point Health 2025",
            category: .funFact,
            icon: "face.smiling.inverse"
        ),

        // Enhanced Senses & Sensory Changes
        PregnancyFunFact(
            title: "Superpower Sense of Smell",
            fact: "Many pregnant women develop hyperosmia—a dramatically heightened sense of smell. This evolutionary adaptation may help protect you and baby from harmful foods or toxins, though it can make your favorite perfume suddenly unbearable!",
            source: "Physiology & Behavior 2024",
            category: .awareness,
            icon: "nose.fill"
        ),

        PregnancyFunFact(
            title: "Why Everything Smells So Strong",
            fact: "Rising estrogen and hCG hormones during pregnancy increase olfactory sensitivity. Some women report being able to detect smells from rooms away—it's not your imagination, it's biology!",
            source: "NIH 2025",
            category: .awareness,
            icon: "sensor.fill"
        ),

        PregnancyFunFact(
            title: "Taste Buds Get Rewired",
            fact: "Pregnancy hormones can alter taste perception, causing metallic tastes or sudden food aversions. Foods you loved might taste completely different—and this change protects baby by steering you away from potentially harmful foods.",
            source: "ScienceDirect 2024",
            category: .awareness,
            icon: "mouth.fill"
        ),

        PregnancyFunFact(
            title: "Your Hearing Gets Sharper Too",
            fact: "Along with smell, many pregnant women experience heightened hearing sensitivity. Background noises may seem louder, and you might notice sounds you never paid attention to before.",
            source: "Aeroflow Breastpumps 2025",
            category: .awareness,
            icon: "ear.fill"
        ),

        PregnancyFunFact(
            title: "Skin Becomes More Sensitive",
            fact: "Increased blood flow and hormonal changes make skin more sensitive during pregnancy. You might find certain fabrics irritating or prefer softer textures—your body is becoming more attuned to physical sensations.",
            source: "Pregatips 2025",
            category: .awareness,
            icon: "hand.raised.fingers.spread.fill"
        ),

        // Nesting Instinct & Hormonal Behaviors
        PregnancyFunFact(
            title: "Nesting Isn't Just a Myth",
            fact: "The urge to clean, organize, and prepare your home in late pregnancy is driven by rising estrogen and oxytocin levels. This biological instinct peaks in the third trimester and is shared across mammalian species!",
            source: "Science 2023",
            category: .awareness,
            icon: "house.fill"
        ),

        PregnancyFunFact(
            title: "Your Brain Rewires for Motherhood",
            fact: "Pregnancy hormones literally rewire your brain! Estrogen and progesterone act on specific neurons to prepare you for parenting—reducing baseline activity while making those neurons MORE responsive to baby-related cues.",
            source: "Francis Crick Institute 2023",
            category: .awareness,
            icon: "brain.head.profile"
        ),

        PregnancyFunFact(
            title: "Nesting Starts Before Labor",
            fact: "Many women experience intense nesting behavior weeks before labor begins. This isn't just 'getting ready'—it's a hormonally-driven compulsion to create a safe, clean space for your baby. Embrace it safely!",
            source: "Americord 2025",
            category: .awareness,
            icon: "sparkles"
        ),

        // Brain Changes & Cognitive Adaptations
        PregnancyFunFact(
            title: "Your Brain Actually Shrinks (But Gets Better!)",
            fact: "Gray matter volume decreases by about 5% during pregnancy, but this isn't 'baby brain'—it's neural refinement! Your brain prunes unnecessary connections to become MORE efficient at recognizing baby's needs and emotional cues.",
            source: "Nature Neuroscience 2024",
            category: .awareness,
            icon: "brain.fill"
        ),

        PregnancyFunFact(
            title: "White Matter Gets Stronger",
            fact: "While gray matter shrinks, white matter (brain connections) actually INCREASES in density during pregnancy. This improves communication between brain regions, enhancing your ability to multitask and respond to your baby.",
            source: "Nature Communications 2025",
            category: .awareness,
            icon: "network"
        ),

        PregnancyFunFact(
            title: "Brain Changes Last for Years",
            fact: "The brain changes from pregnancy can persist for at least 2 years postpartum—some regions never fully return to pre-pregnancy size. These lasting changes enhance maternal attachment and caregiving abilities.",
            source: "Nature 2025",
            category: .awareness,
            icon: "clock.arrow.2.circlepath"
        ),

        PregnancyFunFact(
            title: "Pregnancy Brain Is Real—But Positive!",
            fact: "80% of pregnant women report memory changes. But research shows this 'pregnancy brain' is actually your brain reorganizing to prioritize baby-related information and social-emotional processing over less critical tasks.",
            source: "BMC Pregnancy & Childbirth 2025",
            category: .awareness,
            icon: "lightbulb.fill"
        ),

        PregnancyFunFact(
            title: "Your Brain Becomes More Social",
            fact: "Brain regions involved in social cognition and empathy show dramatic increases in activity during pregnancy. This neuroplasticity helps you attune to your baby's needs and strengthens maternal bonding.",
            source: "Nature Neuroscience 2024",
            category: .awareness,
            icon: "person.2.fill"
        ),

        PregnancyFunFact(
            title: "Hormones Create a U-Shaped Brain Journey",
            fact: "Your brain follows a U-shaped trajectory: shrinking during pregnancy as hormones peak, then partially recovering postpartum as hormone levels drop. This mirrors the dramatic hormone fluctuations before and after birth.",
            source: "Nature Communications 2025",
            category: .awareness,
            icon: "chart.line.uptrend.xyaxis"
        ),

        PregnancyFunFact(
            title: "Pregnancy Rewires Your Emotional Center",
            fact: "The amygdala (emotion processing center) and hypothalamus undergo significant remodeling during pregnancy. These changes make you more responsive to infant cues like crying and enhance protective maternal instincts.",
            source: "Nature 2024",
            category: .awareness,
            icon: "heart.circle.fill"
        ),

        // Weird & Wonderful Baby Facts
        PregnancyFunFact(
            title: "How Does Baby Breathe Without Air?",
            fact: "Your baby doesn't breathe air in the womb! Oxygen comes through the placenta and umbilical cord directly into their bloodstream. At birth, the first cry expands their lungs and triggers a dramatic shift—within seconds, their circulation changes to start breathing air.",
            source: "What to Expect 2025",
            category: .funFact,
            icon: "wind"
        ),

        PregnancyFunFact(
            title: "Baby's First Breath Is EPIC",
            fact: "The transition from womb to world happens in seconds! As your baby takes their first breath, fluid is rapidly absorbed from their lungs, blood vessels in the lungs open wide, and the circulation system completely reorganizes. It's one of the most dramatic physiological changes humans ever experience!",
            source: "Wikipedia 2025",
            category: .funFact,
            icon: "burst.fill"
        ),

        PregnancyFunFact(
            title: "Yes, Baby Pees—A LOT!",
            fact: "By 31-34 weeks, your baby pees about 500ml daily into the amniotic fluid! They've been urinating since 8 weeks. Don't worry—fetal urine is sterile and makes up most of the amniotic fluid. The fluid is completely refreshed every 3 hours.",
            source: "Vinmec 2025",
            category: .funFact,
            icon: "drop.circle.fill"
        ),

        PregnancyFunFact(
            title: "Baby Drinks Their Own Pee (It's Okay!)",
            fact: "Your baby swallows amniotic fluid (which includes their own urine) starting at 12 weeks! This helps develop their digestive system, kidneys, and lungs. By 20 weeks, they're swallowing up to 3 cups daily. It's a crucial part of development.",
            source: "Vinmec 2025",
            category: .funFact,
            icon: "figure.water.fitness"
        ),

        PregnancyFunFact(
            title: "Meconium: Baby's First Poop",
            fact: "Babies DON'T poop in the womb normally—waste accumulates as meconium (dark, sticky first poop). It's made from swallowed amniotic fluid, shed skin cells, and digestive secretions. Ideally it stays inside until after birth. That first diaper is memorable!",
            source: "Cleveland Clinic 2025",
            category: .funFact,
            icon: "exclamationmark.circle.fill"
        ),

        PregnancyFunFact(
            title: "Meconium Builds Up From Week 24",
            fact: "Starting around 24 weeks, meconium (first poop) gradually accumulates in baby's intestines from swallowing amniotic fluid and cell shedding. It's typically not released until after birth—though 5-20% of babies pass it before delivery, staining the amniotic fluid green.",
            source: "AJOG 2023",
            category: .funFact,
            icon: "timer"
        ),

        PregnancyFunFact(
            title: "When Do Eyes Start Working?",
            fact: "At 27 weeks, your baby's eyes open for the first time! They can distinguish between light and dark and even detect bright light shining on your belly. By 26 weeks, they may turn their head toward light sources—they're already curious about the world!",
            source: "BabyCenter 2024",
            category: .funFact,
            icon: "eye.circle.fill"
        ),

        PregnancyFunFact(
            title: "Baby Can Recognize Faces—Before Birth!",
            fact: "A 2025 study found that fetuses at 26+ weeks show preference for face-like patterns! When researchers shone lights through the uterus in face-like vs. scrambled patterns, babies turned toward the face pattern more often. Face recognition starts in the womb!",
            source: "NIH 2025",
            category: .funFact,
            icon: "face.smiling.fill"
        ),

        PregnancyFunFact(
            title: "What If You're Upside Down?",
            fact: "Gravity doesn't affect your baby the same way it affects you! They're suspended in amniotic fluid, which provides buoyancy and cushioning. Whether you're standing, sitting, or even upside down in a yoga pose, baby stays safe in their fluid-filled bubble.",
            source: "Frontiers 2024",
            category: .funFact,
            icon: "figure.flexibility"
        ),

        PregnancyFunFact(
            title: "Breech Babies Don't Fall on Their Heads",
            fact: "About 3% of babies are breech (head up) at term. The amniotic fluid suspends them weightlessly, so gravity isn't pulling their head down uncomfortably. They're as cozy head-up as head-down—though head-down makes birth easier!",
            source: "Family Doctor 2025",
            category: .funFact,
            icon: "arrow.down.circle.fill"
        ),

        PregnancyFunFact(
            title: "Why Babies Move and Kick",
            fact: "Your baby moves to build muscles and bones, practice motor skills, and exercise their developing nervous system! Movement starts at 7 weeks but you feel it around 16-25 weeks. Those kicks are baby's workout routine—essential for healthy development.",
            source: "BMC Pregnancy 2024",
            category: .funFact,
            icon: "figure.run"
        ),

        PregnancyFunFact(
            title: "Movement Means 'I'm Healthy!'",
            fact: "Fetal movement is baby's BEST way to communicate wellbeing. When babies are unwell, they slow down to preserve energy. That's why doctors ask about movement at every visit. Changes in movement patterns need immediate attention—movements matter!",
            source: "PUSH Pregnancy 2024",
            category: .funFact,
            icon: "exclamationmark.bubble.fill"
        ),

        PregnancyFunFact(
            title: "Baby Can Feel You Moving Too!",
            fact: "Studies show babies respond to maternal position changes! When you lie down, bend over, or exercise, baby may shift position or increase movement. They're constantly aware of their environment and your activity level affects theirs.",
            source: "Frontiers Physiology 2024",
            category: .funFact,
            icon: "arrow.2.circlepath.circle.fill"
        ),

        PregnancyFunFact(
            title: "Babies Don't Get Sick Like We Do",
            fact: "Your baby has a protected immune system! The placenta acts as a selective barrier, filtering out most harmful bacteria and viruses. Plus, you transfer protective antibodies through the placenta, especially in the third trimester, giving baby immunity for months after birth.",
            source: "Vaccines 2024",
            category: .funFact,
            icon: "shield.checkered.fill"
        ),

        PregnancyFunFact(
            title: "Your Antibodies Protect Baby",
            fact: "Maternal antibodies cross the placenta starting around 17 weeks and peak in the third trimester. These antibodies protect your newborn for the first 3-6 months of life while their immune system matures. Your immunity literally becomes their immunity!",
            source: "NIH 2024",
            category: .funFact,
            icon: "shield.lefthalf.filled"
        ),

        PregnancyFunFact(
            title: "When You Get Sick, Baby's Protected",
            fact: "If you get sick during pregnancy, your immune response creates antibodies that cross the placenta to protect baby from the same illness! This is why pregnancy vaccinations (flu, Tdap, COVID) are so important—they protect both of you.",
            source: "Centre OB/GYN 2024",
            category: .funFact,
            icon: "cross.case.circle.fill"
        ),

        PregnancyFunFact(
            title: "Breastfeeding Extends the Protection",
            fact: "The immune protection continues through breast milk! If you're exposed to germs your baby might encounter, your body makes specific antibodies that transfer through milk. Your immune system customizes protection based on your baby's environment!",
            source: "NIH 2024",
            category: .funFact,
            icon: "heart.text.square.fill"
        ),

        // MARK: - Pre-eclampsia & Nutrition Risks

        PregnancyFunFact(
            title: "Pre-eclampsia: A Serious Condition",
            fact: "Pre-eclampsia affects 2-8% of pregnancies worldwide and causes high blood pressure after 20 weeks. Risk factors include first pregnancy, obesity, age over 40, family history, and pre-existing conditions. Early detection through prenatal care is crucial for managing this serious condition.",
            source: "WHO 2025",
            category: .complications,
            icon: "heart.text.square",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Aspirin May Reduce Pre-eclampsia Risk",
            fact: "Low-dose aspirin (81mg daily) started before 16 weeks can reduce pre-eclampsia risk by over 50% in high-risk pregnancies. Combined with calcium, vitamin D, and regular prenatal care, prevention strategies are becoming more effective.",
            source: "NIH 2023",
            category: .health,
            icon: "pills.circle",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "Undernutrition Risks Baby's Development",
            fact: "Maternal malnutrition increases risks of low birth weight, preterm birth, and developmental delays. Adequate protein, iron, folate, and calories are essential. If you're struggling to eat due to nausea, small frequent meals and prenatal vitamins help protect baby.",
            source: "BMC Nutrition 2024",
            category: .awareness,
            icon: "exclamationmark.triangle"
        ),

        PregnancyFunFact(
            title: "The Dangers of Over-Eating",
            fact: "Excessive weight gain (>35 lbs for normal BMI) increases risks of gestational diabetes, pre-eclampsia, cesarean delivery, and complications. Ultra-processed foods are linked to poor glycemic control. Focus on nutrient-dense whole foods instead of 'eating for two.'",
            source: "Clinical Nutrition 2025",
            category: .nutrition,
            icon: "chart.line.uptrend.xyaxis"
        ),

        PregnancyFunFact(
            title: "Gestational Diabetes Risk Doubles with Obesity",
            fact: "Obesity (BMI ≥30) before pregnancy nearly doubles the risk of gestational diabetes. The condition affects blood sugar regulation and can impact baby's growth. Diet, exercise, and early screening are key to prevention and management.",
            source: "StatPearls 2025",
            category: .complications,
            icon: "drop.circle",
            applicableTrimester: 2
        ),

        // MARK: - Historical Pregnancy Practices

        PregnancyFunFact(
            title: "Ancient Egyptian Birth Bricks",
            fact: "Egyptian women gave birth squatting on special 'birth bricks' decorated with protective deities and magical spells! Midwives, magic wands, and amulets were used to protect mother and baby. Birth was a private, home-based ritual supported by female family members.",
            source: "Penn Museum 2024",
            category: .funFact,
            icon: "house.and.flag"
        ),

        PregnancyFunFact(
            title: "Egyptian Pregnancy Test (3,500 Years Ago!)",
            fact: "Ancient Egyptians had a pregnancy test! Women urinated on barley and wheat seeds. If barley sprouted, it was a boy; wheat meant a girl. Remarkably, modern tests confirmed urine from pregnant women does make seeds grow faster due to hormones!",
            source: "Ancient Medicine 2025",
            category: .funFact,
            icon: "testtube.2"
        ),

        PregnancyFunFact(
            title: "Victorian 'Confinement' Was Isolating",
            fact: "In 1800s Germany and Britain, pregnant women entered 'confinement' for the final months—staying indoors, curtains drawn, avoiding visitors. This isolation increased depression and complications. Modern midwifery began pushing back against this practice in the late 1800s.",
            source: "Modern German Midwifery 2016",
            category: .funFact,
            icon: "house.circle"
        ),

        PregnancyFunFact(
            title: "German Midwifery Modernized Medicine",
            fact: "Between 1885-1960, Germany transformed midwifery from 'Storchtanten' (stork aunts) to educated professionals with scientific training. They embraced modern medicine while preserving the art of natural childbirth—a model many countries still follow today.",
            source: "Routledge 2014",
            category: .funFact,
            icon: "book.and.wrench"
        ),

        PregnancyFunFact(
            title: "Roman Birth Superstitions",
            fact: "Ancient Romans believed wearing certain amulets ensured safe childbirth, and that eagles' stones (rough geodes) could either ease or prevent labor depending on placement! They also thought eating specific foods would determine baby's personality traits.",
            source: "Historical Medicine 2024",
            category: .funFact,
            icon: "sparkles"
        ),

        PregnancyFunFact(
            title: "Roman Women Gave Birth Squatting",
            fact: "Roman women typically gave birth on birthing chairs or stools, attended by midwives called 'obstetrices.' Despite lacking modern medicine, they understood the importance of hygiene, warm water, and emotional support during labor.",
            source: "Birthing Romans 2024",
            category: .funFact,
            icon: "figure.seated.side"
        ),

        PregnancyFunFact(
            title: "Dark History: Nazi Medical Atrocities",
            fact: "In concentration camps, Nazi doctors conducted horrific forced abortions, sterilizations, and experiments on pregnant women—violating every principle of medical ethics. This history led directly to the Nuremberg Code (1947) establishing informed consent as fundamental to medical research.",
            source: "GynOb Ethics 2024",
            category: .awareness,
            icon: "exclamationmark.shield"
        ),

        // MARK: - Pregnancy Physiology

        PregnancyFunFact(
            title: "Sex During Pregnancy Is Usually Safe",
            fact: "Unless your doctor advises otherwise (placenta previa, preterm labor risk), sex is safe throughout pregnancy! The baby is protected by amniotic fluid and cervical mucus plug. Orgasms may cause mild cramping (Braxton Hicks), which is normal and harmless.",
            source: "ACOG 2024",
            category: .health,
            icon: "heart.circle"
        ),

        PregnancyFunFact(
            title: "When Does Milk Production Start?",
            fact: "Your breasts start producing colostrum (first milk) around 16-22 weeks! You might leak small amounts in the third trimester. Full milk production kicks in 2-3 days after birth when hormones shift dramatically. It's all automated by your body!",
            source: "La Leche League 2024",
            category: .funFact,
            icon: "drop.fill",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Your Breasts Prepare for MONTHS",
            fact: "From early pregnancy, milk ducts multiply and breast tissue transforms. By mid-pregnancy, you could technically breastfeed if needed! Areolas darken to help newborns (with poor vision) find the nipple. Your body plans ahead!",
            source: "Breastfeeding Medicine 2024",
            category: .funFact,
            icon: "target",
            applicableTrimester: 1
        ),

        PregnancyFunFact(
            title: "Baby 'Practices' Drinking in the Womb",
            fact: "Babies swallow up to 500ml of amniotic fluid daily by the third trimester! This 'practice feeding' develops their digestive system and teaches them to coordinate sucking and swallowing—skills they'll need immediately after birth.",
            source: "Vinmec 2025",
            category: .funFact,
            icon: "mouth",
            applicableTrimester: 3
        ),

        PregnancyFunFact(
            title: "Colostrum Is Liquid Gold",
            fact: "The first milk (colostrum) is packed with antibodies, white blood cells, and growth factors—offering concentrated immunity in tiny volumes perfect for newborn stomachs (only walnut-sized at birth!). Just a few teaspoons per feeding is enough!",
            source: "WHO 2024",
            category: .health,
            icon: "sparkles.rectangle.stack"
        ),

        PregnancyFunFact(
            title: "Pregnancy Increases Blood Volume by 50%!",
            fact: "Your blood volume expands by 40-50% during pregnancy to support the placenta and baby. This is why you may feel warm, sweat more, and need extra iron and fluids. Your heart works 30-50% harder pumping all that extra blood!",
            source: "NIH 2024",
            category: .trimester2,
            icon: "heart.circle.fill",
            applicableTrimester: 2
        ),

        PregnancyFunFact(
            title: "Why Pregnancy Makes You Glow (or Break Out)",
            fact: "Increased blood flow brings extra nutrients and oxygen to skin cells, creating the famous 'pregnancy glow!' But hormones also increase oil production—which can cause acne. Same hormones, different effects. Your skin's doing its best!",
            source: "Dermatology 2024",
            category: .funFact,
            icon: "sparkle"
        ),

        PregnancyFunFact(
            title: "Your Uterus Grows 500 Times Larger",
            fact: "Your uterus grows from the size of a pear (50g) to a watermelon (1000g+), expanding 500x in volume! After birth, it shrinks back in just 6 weeks through powerful contractions. The human body's elasticity is mind-blowing.",
            source: "Obstetrics 2024",
            category: .trimester3,
            icon: "arrow.up.and.down.circle",
            applicableTrimester: 3
        ),

        // MARK: - Reddit Testimonials: "Things I Wish I'd Known"

        PregnancyFunFact(
            title: "Newborns Are Surprisingly Noisy Sleepers",
            fact: "I wish I knew what noisy sleepers they are when they are very little. It's shocking. The grunts. Mouth noises. Snores. Gurgles. I never really worried they weren't breathing!",
            source: "Reddit r/Mommit",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "MsRachelGroupie"
        ),

        PregnancyFunFact(
            title: "Breastfeeding Doesn't Come Naturally",
            fact: "Breastfeeding is very hard and doesn't come naturally to you or your baby so put on your patience pants! Cluster feeding is agonizing as a new parent.",
            source: "Reddit r/Mommit",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Vivid_Pea_5229"
        ),

        PregnancyFunFact(
            title: "Even 'Easy' Babies Cry More Than You Expect",
            fact: "Everybody told me that newborns are easy because they eat, sleep, and poop. That's a lie unless you have a very calm baby. Most newborns cry and they cry a lot. I was genuinely surprised by how much she cried.",
            source: "Reddit r/BabyBumps",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "dandanmichaelis"
        ),

        PregnancyFunFact(
            title: "Self-Care Becomes Impossible",
            fact: "I convinced myself I'd sit at my vanity and do my hair and makeup everyday. Bro, I can't even shower anymore. RIP to all the nap workouts I thought I'd get!",
            source: "Reddit r/beyondthebump",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "beeteeelle"
        ),

        PregnancyFunFact(
            title: "Sleep After Birth? Not Exactly",
            fact: "I kept saying to myself I can't wait to give birth so I can finally get some sleep! I forgot that I'd have to pump every three hours and had a newborn to take care of.",
            source: "Reddit r/beyondthebump",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "passionfruit0"
        ),

        PregnancyFunFact(
            title: "Postpartum Anxiety Is Real",
            fact: "Anxiety! They said to look out for depression but anxiety was never discussed. I was blindsided. For me, this was the hardest part of postpartum.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Ann Ross E"
        ),

        PregnancyFunFact(
            title: "The Belly Massage Is Intense",
            fact: "They 'massage' your belly after birth to help the uterus go back down. It's more like aggressively kneading dough. Not what I expected at all!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "That First Postpartum Poop",
            fact: "Pack stool softeners. The first postpartum poop is really scary. No one talks about this but everyone should know!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Extreme Night Sweats",
            fact: "Intense night sweats after giving birth, waking up DRENCHED in sweat and able-to-wring-your-clothes-out wet. This lasted for weeks!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "You Become Invisible",
            fact: "Once the baby comes out, no one cares about you and literally everyone focuses on the baby all the time. Visitors will walk right past you to see the baby.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Love at First Sight Isn't Always Instant",
            fact: "You might not feel in love at first sight with your baby and that is normal and okay! The bond grows over time for many of us.",
            source: "Reddit r/BabyBumps",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "ashleyg402246002"
        ),

        PregnancyFunFact(
            title: "Baby Stillness Can Be Terrifying",
            fact: "Babies go for long periods of time without moving while in the womb. I have made so many trips to the emergency room, just to find out that my little darling had been sleeping for 12 hours.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "The First Night Home Is the Hardest",
            fact: "The first night home is the worst. Nothing prepares you for that moment when you realize there's no nurse call button and it's just you.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "kentuckysunshine"
        ),

        PregnancyFunFact(
            title: "Give Yourself Grace with Feeding",
            fact: "I struggled so much breastfeeding them both but with my second I gave myself a lot more grace. It doesn't matter if you bottle or breastfeed as long as baby gets fed.",
            source: "Reddit r/Parenting",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "YorkshireDuck91"
        ),

        PregnancyFunFact(
            title: "Best Advice: Sleep When Baby Sleeps",
            fact: "Sleep when the baby sleeps. Clean when the baby cleans. This became my mantra for survival!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Eyebrows McGee"
        ),

        PregnancyFunFact(
            title: "Goodbye, Workout Plans",
            fact: "RIP to all the nap workouts I thought I'd get! My son contact napped for eight months. The unpredictability is real.",
            source: "Reddit r/beyondthebump",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "beeteeelle"
        ),

        PregnancyFunFact(
            title: "Martha Stewart Dreams? Think Again",
            fact: "I thought I would basically come out of maternity leave as Ina Garten. I was so naive. Just keeping everyone fed and alive is an accomplishment!",
            source: "Reddit r/beyondthebump",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "I Was Completely Unprepared",
            fact: "I was completely and utterly ignorant and terrified. I didn't know anything! I was an ostrich burying my head in the sand until I was about 35 weeks and then the panic set in.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Take Photos of YOU with Baby",
            fact: "Take lots and lots of pictures of yourself with the baby! You'll have 100 photos of baby and dad but not with yourself! I regret this so much.",
            source: "Reddit r/Mommit",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Kiran Z"
        ),

        PregnancyFunFact(
            title: "Morning Sickness Lasts All Day",
            fact: "Morning sickness isn't limited to mornings; it's all-day nausea. I had it from week 6 to week 14, and calling it 'morning' sickness is the biggest lie ever told.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Nobody Prepares You for the Shakes",
            fact: "The shakes during labor are intense. I could barely hold my baby afterward. My whole body was trembling uncontrollably for what felt like hours.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "You Might Throw Up During Labor",
            fact: "You might throw up during labor. I projectile vomited between pushes. No one warned me about this and I was mortified at the time.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "You'll Fall Asleep Between Contractions",
            fact: "You fall asleep between contractions from exhaustion, then shock awakes you. I couldn't believe my body would just pass out like that.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Hair Loss Is Real",
            fact: "Hair loss occurs significantly in postpartum months. I thought I was going bald! It was coming out in handfuls in the shower around 3-4 months postpartum.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Your Shoes Might Not Fit Anymore",
            fact: "You may go up a half to a whole shoe size during pregnancy and never go back to normal. I had to buy all new shoes. My feet permanently changed!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Phantom Baby Kicks Are a Thing",
            fact: "You may experience phantom baby kicks months later. I was almost two years postpartum and still felt them! It's the weirdest sensation.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Visitors Right Away? Maybe Not",
            fact: "I regret allowing family and friends to visit right away. We said to come over whenever, but I will probably be more strict on initial visitors next time. I needed rest and bonding time.",
            source: "Reddit r/BabyBumps",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "butterfengars"
        ),

        PregnancyFunFact(
            title: "The Ring of Fire Is Real",
            fact: "The 'ring of fire' when baby crowns is extremely painful if unprepared. It's called that for a reason—it literally feels like burning.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "You Push Out the Placenta Too",
            fact: "You push out the placenta after the baby arrives. I had no idea! I thought once the baby was out, it was over. Nope, there's more.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Recovery Takes Longer Than 6 Weeks",
            fact: "A 6 week recovery time is laughable. My body went through so much trauma that three years later I am FINALLY feeling somewhat normal. Don't rush yourself.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Your Body May Feel Foreign",
            fact: "Your body may seem foreign to you. I didn't feel like myself for months. Everything looked and felt different, and that's totally normal.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Ask for Help—Seriously",
            fact: "Accept help when it's offered! With my first, I tried to do everything myself. With my second, I learned to say yes when people offered to bring food or hold the baby.",
            source: "Reddit r/Parenting",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Bone-Crushing Exhaustion",
            fact: "In my first trimester, I experienced bone crushing soul sucking exhaustion. I would come home from work, nap, eat dinner and go to bed. It's not regular tiredness.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Pregnancy Changes Your Senses Forever",
            fact: "My sense of smell increased 100 times normal. Not in a good way. I could smell things from the other side of the house. Years later, I'm still quite sensitive.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Feeling Like Baby Will Fall Out",
            fact: "My baby was so heavy that every time I stood up for the last three weeks, I felt like he was going to fall out of me. So uncomfortable!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Your Emotional Response May Surprise You",
            fact: "Even in planned pregnancies, happiness and excitement aren't always the first emotions. I cried when I found out, and they weren't happy tears. That's okay!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Fed Is Best, Period",
            fact: "There shouldn't be a stigma about not being able to breastfeed. I struggled to produce enough milk despite working with lactation nurses. Formula is food!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Nobody Tells You About Postpartum Rage",
            fact: "Postpartum rage is real and nobody talks about it. I would get so angry over the smallest things. It's a symptom of postpartum mood disorders.",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "You're Not Missing Out on Newborn Stage",
            fact: "Mine are 8 and 6. I rejoiced to be done with the newborn stage. It was not a good stage for me with either of them. It's okay not to love every phase.",
            source: "Reddit r/Parenting",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Each Pregnancy Is Completely Different",
            fact: "I have 3 kids—the 1st pregnancy was very typical. 2nd pregnancy was awful. I was miserable and sick the entire time. 3rd pregnancy was easy peasy. You never know!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        ),

        PregnancyFunFact(
            title: "Your Gums Will Probably Bleed",
            fact: "60-75% of pregnant women develop bleeding gums. I had no idea this was pregnancy-related until my dentist told me. It's the hormones!",
            source: "Reddit Community",
            category: .redditTestimonial,
            icon: "quote.bubble.fill",
            redditUsername: "Anonymous"
        )
    ]

    static func randomFact() -> PregnancyFunFact {
        allFacts.randomElement() ?? allFacts[0]
    }

    // MARK: - Smart Distribution Logic

    /// Get facts appropriate for the current trimester
    static func factsForCurrentWeek(_ weekNumber: Int) -> [PregnancyFunFact] {
        let trimester = weekNumber <= 13 ? 1 : weekNumber <= 27 ? 2 : 3
        return allFacts.filter {
            $0.applicableTrimester == nil || $0.applicableTrimester == trimester
        }
    }

    /// Select a random fact with smart distribution based on current week
    /// Distribution: 25% Health Tips, 25% Trimester-Specific, 25% Serious Awareness, 15% Reddit Testimonials, 10% Fun Facts
    static func randomFactWithDistribution(currentWeek: Int) -> PregnancyFunFact {
        let random = Int.random(in: 1...100)
        let trimester = currentWeek <= 13 ? 1 : currentWeek <= 27 ? 2 : 3

        let categoryFilter: (PregnancyFunFact) -> Bool = { fact in
            switch random {
            case 1...25: // 25% Health Tips & Nutrition
                return [.health, .nutrition].contains(fact.category) &&
                       (fact.applicableTrimester == nil || fact.applicableTrimester == trimester)

            case 26...50: // 25% Trimester-Specific
                // Prefer facts marked for current trimester
                if fact.applicableTrimester == trimester {
                    return true
                }
                // Also include trimester category facts for current trimester
                return (fact.category == .trimester1 && trimester == 1) ||
                       (fact.category == .trimester2 && trimester == 2) ||
                       (fact.category == .trimester3 && trimester == 3)

            case 51...75: // 25% Serious Awareness
                return [.mentalHealth, .complications, .emergency, .awareness].contains(fact.category) &&
                       (fact.applicableTrimester == nil || fact.applicableTrimester == trimester)

            case 76...90: // 15% Reddit Testimonials
                return fact.category == .redditTestimonial

            case 91...100: // 10% Fun Facts
                return fact.category == .funFact

            default:
                return true
            }
        }

        let eligibleFacts = allFacts.filter(categoryFilter)

        // Fallback: if no eligible facts found, return any fact for current trimester
        if eligibleFacts.isEmpty {
            let trimesterFacts = factsForCurrentWeek(currentWeek)
            return trimesterFacts.randomElement() ?? allFacts.randomElement() ?? allFacts[0]
        }

        return eligibleFacts.randomElement() ?? allFacts[0]
    }
}

// MARK: - Rotating Fun Fact Card View (iOS 26 Design)
struct PregnancyFunFactCard: View {
    @State private var currentFact: PregnancyFunFact
    @State private var isAnimating = false
    @State private var timer: Timer?

    let rotationInterval: TimeInterval = 30.0 // Change fact every 30 seconds
    let currentWeek: Int? // Optional current pregnancy week for smart distribution

    init(currentWeek: Int? = nil) {
        self.currentWeek = currentWeek
        if let week = currentWeek {
            _currentFact = State(initialValue: PregnancyFunFact.randomFactWithDistribution(currentWeek: week))
        } else {
            _currentFact = State(initialValue: PregnancyFunFact.randomFact())
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with category badge
            HStack(spacing: 8) {
                // Category badge
                HStack(spacing: 4) {
                    Image(systemName: currentFact.icon)
                        .font(.caption2)
                    Text(categoryName)
                        .font(.caption2)
                        .fontWeight(.semibold)
                }
                .foregroundColor(currentFact.category.color)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(currentFact.category.color.opacity(0.15))
                        .overlay(
                            Capsule()
                                .stroke(currentFact.category.color.opacity(0.3), lineWidth: 0.5)
                        )
                )

                Spacer()

                // Auto-rotate indicator
                HStack(spacing: 4) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.caption2)
                        .rotationEffect(.degrees(isAnimating ? 360 : 0))
                        .animation(.linear(duration: 2).repeatForever(autoreverses: false), value: isAnimating)
                    Text("Auto")
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)

            
            // Main content with liquid glass effect
            VStack(alignment: .leading, spacing: 10) {
                // Title
                Text(currentFact.title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(2, reservesSpace: false)
                    .fixedSize(horizontal: false, vertical: true)

                // Reddit username (only for testimonials)
                if let username = currentFact.redditUsername {
                    HStack(spacing: 4) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 11))
                        Text("u/\(username)")
                            .font(.system(size: 11))
                            .fontWeight(.medium)
                    }
                    .foregroundColor(currentFact.category.color)
                }

                // Fact text
                Text(currentFact.fact)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(4, reservesSpace: false)
                    .fixedSize(horizontal: false, vertical: true)

                // Source attribution
                HStack(spacing: 4) {
                    Image(systemName: currentFact.category == .redditTestimonial ? "link.circle.fill" : "doc.text.fill")
                        .font(.system(size: 9))
                    Text("Source: \(currentFact.source)")
                        .font(.system(size: 10))
                }
                .foregroundColor(.secondary.opacity(0.8))
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                LinearGradient(
                                    colors: [
                                        currentFact.category.color.opacity(0.3),
                                        currentFact.category.color.opacity(0.1)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.secondarySystemBackground))
        )
        .shadow(color: currentFact.category.color.opacity(0.15), radius: 8, x: 0, y: 4)
        .transition(.asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        ))
        .onAppear {
            isAnimating = true
            startAutoRotation()
        }
        .onDisappear {
            stopAutoRotation()
        }
        .onTapGesture {
            rotateFact()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Pregnancy tip: \(currentFact.title). \(currentFact.fact). Source: \(currentFact.source)")
        .accessibilityHint("Double tap to show next tip")
    }

    private var categoryName: String {
        switch currentFact.category {
        case .exercise: return "Exercise"
        case .nutrition: return "Nutrition"
        case .health: return "Health"
        case .labor: return "Labor"
        case .mentalHealth: return "Mental Health"
        case .complications: return "Complications"
        case .emergency: return "Emergency"
        case .awareness: return "Awareness"
        case .trimester1: return "First Trimester"
        case .trimester2: return "Second Trimester"
        case .trimester3: return "Third Trimester"
        case .funFact: return "Fun Fact"
        case .redditTestimonial: return "Reddit"
        }
    }

    private var isRelevantToCurrentTrimester: Bool {
        guard let week = currentWeek else { return false }
        let trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3

        // Check if fact has a specific trimester match
        if let applicableTrimester = currentFact.applicableTrimester {
            return applicableTrimester == trimester
        }

        // Check if the category matches current trimester
        switch currentFact.category {
        case .trimester1: return trimester == 1
        case .trimester2: return trimester == 2
        case .trimester3: return trimester == 3
        default: return false
        }
    }

    private func startAutoRotation() {
        timer = Timer.scheduledTimer(withTimeInterval: rotationInterval, repeats: true) { _ in
            rotateFact()
        }
    }

    private func stopAutoRotation() {
        timer?.invalidate()
        timer = nil
    }

    private func rotateFact() {
        withAnimation(.smooth(duration: 0.4)) {
            // Get a different fact using smart distribution if week is available
            var newFact: PregnancyFunFact
            if let week = currentWeek {
                newFact = PregnancyFunFact.randomFactWithDistribution(currentWeek: week)
            } else {
                newFact = PregnancyFunFact.randomFact()
            }

            // Ensure we get a different fact
            var attempts = 0
            while newFact.id == currentFact.id && PregnancyFunFact.allFacts.count > 1 && attempts < 10 {
                if let week = currentWeek {
                    newFact = PregnancyFunFact.randomFactWithDistribution(currentWeek: week)
                } else {
                    newFact = PregnancyFunFact.randomFact()
                }
                attempts += 1
            }
            currentFact = newFact
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
    }
}

#Preview {
    VStack {
        PregnancyFunFactCard()
            .padding()
        Spacer()
    }
    .background(Color(.systemGroupedBackground))
}
