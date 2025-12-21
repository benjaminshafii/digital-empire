# Task 3: Extended Pregnancy Fun Facts

**Date**: November 2, 2025
**App**: Corgina (Pregnancy Tracking iOS App)
**Goal**: Extend pregnancy fun facts database with extensively researched content

---

## Current Implementation Analysis

### Existing Data Model
```swift
struct PregnancyFunFact: Identifiable {
    let id = UUID()
    let title: String
    let fact: String
    let source: String
    let category: FactCategory
    let icon: String

    enum FactCategory {
        case exercise
        case nutrition
        case health
        case labor
    }
}
```

### Current Database Statistics
- **Total Facts**: 15
- **Category Distribution**:
  - Exercise: 8 facts (53%)
  - Health: 5 facts (33%)
  - Labor: 2 facts (13%)
  - Nutrition: 0 facts (0%)

### Issues with Current Implementation
1. Heavy bias toward exercise facts (53%)
2. No nutrition facts despite having a category
3. Missing key categories: trimester-specific facts, mental health, funny/interesting facts
4. No serious awareness facts about complications
5. No trimester-based filtering logic

---

## Proposed Category Distribution

Based on requirements for content split:
- **30% Health Tips & Medical Information** (18 facts)
- **30% Trimester-Specific Fun Facts** (18 facts)
- **30% Serious Awareness Topics** (18 facts)
- **10% Random Interesting/Funny Facts** (6 facts)

**Target Total**: 60 facts (45 new facts to add)

---

## Researched Facts by Category

### CATEGORY 1: Health Tips & Medical Information (30%)

#### 1.1 Prenatal Vitamins & Nutrition

**Fact 1: Folic Acid Prevents Birth Defects**
- **Title**: "Folic Acid is Your Baby's Best Friend"
- **Fact**: "Taking 400-800 mcg of folic acid daily before and during early pregnancy can prevent up to 70% of neural tube defects like spina bifida. Start before conception if possible!"
- **Source**: "CDC 2025"
- **Category**: nutrition
- **Icon**: "pills.fill"

**Fact 2: Iron Powers Your Blood**
- **Title**: "Your Blood Volume Doubles"
- **Fact**: "During pregnancy, your blood volume increases by 50%, which is why you need 27mg of iron daily—50% more than before pregnancy. This supports your baby's growth and brain development."
- **Source**: "ACOG 2025"
- **Category**: nutrition
- **Icon**: "drop.fill"

**Fact 3: Calcium Builds Strong Bones**
- **Title**: "Calcium: Not Just for Milk"
- **Fact**: "You need 1,000mg of calcium daily (1,300mg if you're 18 or younger). Adequate calcium intake reduces your risk of preeclampsia and builds your baby's bones and teeth."
- **Source**: "NIH 2025"
- **Category**: nutrition
- **Icon**: "bone.fill"

**Fact 4: Vitamin D for Immunity**
- **Title**: "The Sunshine Vitamin"
- **Fact**: "All pregnant women need 600 IU of vitamin D daily to regulate calcium and phosphate, keeping bones, teeth, and muscles healthy. Deficiency is linked to increased stretch mark risk."
- **Source**: "NHS 2025"
- **Category**: nutrition
- **Icon**: "sun.max.fill"

**Fact 5: Protein Requirements Increase**
- **Title**: "Building Blocks for Baby"
- **Fact**: "Pregnant women need an extra 25 grams of protein daily (about 71g total) to support your baby's rapid tissue and organ growth, especially in the second and third trimesters."
- **Source**: "ACOG 2025"
- **Category**: nutrition
- **Icon**: "leaf.fill"

#### 1.2 Hydration

**Fact 6: Hydration Prevents Complications**
- **Title**: "Water is Your Pregnancy Superpower"
- **Fact**: "Drink 8-12 cups (64-96 oz) of water daily. Adequate hydration reduces your risk of UTIs, preterm labor, headaches, kidney stones, and helps maintain healthy amniotic fluid levels."
- **Source**: "Institute of Medicine 2025"
- **Category**: health
- **Icon**: "drop.circle.fill"

**Fact 7: Urine Color Test**
- **Title**: "The Simple Hydration Check"
- **Fact**: "Your urine should be pale clear or light yellow. Dark urine means you need more water. Most pregnant women don't meet hydration recommendations, with 63% lacking knowledge of proper intake."
- **Source**: "Tommy's 2025"
- **Category**: health
- **Icon**: "eyedropper.halffull"

**Fact 8: Water Reduces Swelling**
- **Title**: "More Water = Less Swelling?"
- **Fact**: "Counterintuitively, drinking MORE water actually reduces swelling (edema). Proper hydration improves circulation and kidney function, helping your body flush out excess sodium."
- **Source**: "Intermountain Healthcare 2025"
- **Category**: health
- **Icon**: "water.waves"

#### 1.3 Vaccinations

**Fact 9: Flu Shot Protects Two Lives**
- **Title**: "Get Your Flu Shot Every Season"
- **Fact**: "The flu vaccine is safe and recommended at any time during pregnancy. It protects both you and your baby for the first 6 months of life through transferred antibodies."
- **Source**: "CDC ACIP 2024"
- **Category**: health
- **Icon**: "syringe.fill"

**Fact 10: Tdap Every Pregnancy**
- **Title**: "Whooping Cough Protection"
- **Fact**: "Get Tdap vaccine between weeks 27-36 of EVERY pregnancy, even if you had it before. This passes maximum protective antibodies to your baby before birth."
- **Source**: "CDC ACIP 2024"
- **Category**: health
- **Icon**: "shield.checkered"

**Fact 11: COVID Vaccine is Safe**
- **Title**: "Updated COVID Protection"
- **Fact**: "COVID-19 vaccination is recommended for all pregnant women. Studies confirm it's safe and reduces severe illness risk. COVID during pregnancy increases risk of preterm birth and ICU admission."
- **Source**: "CDC 2024"
- **Category**: health
- **Icon**: "cross.case.fill"

#### 1.4 Sleep & Rest

**Fact 12: Left Side Sleeping Saves Lives**
- **Title**: "Sleep on Your Left After 28 Weeks"
- **Fact**: "Sleeping on your left side in the third trimester reduces stillbirth risk by improving blood flow to the uterus and preventing compression of the vena cava, the major vein to your heart."
- **Source**: "Tommy's 2025"
- **Category**: health
- **Icon**: "bed.double.fill"

**Fact 13: Right Side is Safe Too**
- **Title**: "Switch Sides for Comfort"
- **Fact**: "Research shows equal safety sleeping on left or right side. Use pregnancy pillows between your knees to reduce hip pressure. Just avoid flat-back sleeping after 28 weeks."
- **Source**: "Sleep Foundation 2025"
- **Category**: health
- **Icon**: "moon.zzz.fill"

#### 1.5 Dental Health

**Fact 14: Pregnancy Gingivitis is Common**
- **Title**: "Your Gums Need Extra Care"
- **Fact**: "60-75% of pregnant women develop bleeding gums due to hormonal changes making gums more vulnerable to plaque. Untreated periodontitis is linked to preterm birth and low birth weight."
- **Source**: "Penn Dental Medicine 2025"
- **Category**: health
- **Icon**: "mouth.fill"

**Fact 15: Dental Cleanings are Safe**
- **Title**: "Don't Skip the Dentist"
- **Fact**: "Schedule a dental checkup while pregnant—it's completely safe! Brush twice daily with fluoride toothpaste and floss daily, even if your gums are sore. Vitamin C and calcium help gum health."
- **Source**: "NHS 2025"
- **Category**: health
- **Icon**: "tooth.fill"

#### 1.6 Weight Gain

**Fact 16: Healthy Weight Gain by Trimester**
- **Title**: "The Weight Gain Timeline"
- **Fact**: "Gain 1-4 lbs in the first trimester, then about 1 lb/week in the second and third trimesters (0.4 kg/week for normal BMI). You only need 340 extra calories/day in second trimester, 450 in third."
- **Source**: "CDC 2025"
- **Category**: nutrition
- **Icon**: "scalemass.fill"

**Fact 17: Not Really 'Eating for Two'**
- **Title**: "The 'Eating for Two' Myth"
- **Fact**: "You DON'T need to double your calories! You only need an extra 300-450 calories per day in the second and third trimesters—that's about a banana and yogurt."
- **Source**: "Mayo Clinic 2025"
- **Category**: nutrition
- **Icon**: "fork.knife"

#### 1.7 Pelvic Floor

**Fact 18: Kegels Shorten Labor**
- **Title**: "Practice Kegels for Easier Birth"
- **Fact**: "Pregnant women who do Kegel exercises often have easier births, better bladder control, and faster perineal healing. Contract pelvic muscles for 5-10 seconds, repeat 10-20 times daily."
- **Source**: "American Pregnancy Association 2025"
- **Category**: labor
- **Icon**: "figure.flexibility"

---

### CATEGORY 2: Trimester-Specific Fun Facts (30%)

#### 2.1 First Trimester (Weeks 1-13)

**Fact 19: Baby's Heart Beats at 5 Weeks**
- **Title**: "Tiny Heart, Big Beat"
- **Fact**: "Your baby's heart begins beating at just 5 weeks—about twice the rate of your adult heart at 110-160 bpm! It will beat approximately 54 million times before birth."
- **Source**: "Cleveland Clinic 2025"
- **Category**: trimester1
- **Icon**: "heart.circle.fill"

**Fact 20: All Organs Form by Week 12**
- **Title**: "First Trimester: The Critical Period"
- **Fact**: "The first trimester is the most crucial for development—all major organs, the brain, spine, arms, and legs form by week 12. Your baby goes from a single cell to a fully-formed tiny human!"
- **Source**: "ACOG 2025"
- **Category**: trimester1
- **Icon**: "sparkles"

**Fact 21: Fingerprints Form at 9 Weeks**
- **Title**: "Unique From the Start"
- **Fact**: "Your baby develops their unique fingerprints between 9-12 weeks in the womb. At 9 weeks, they can also sigh and have started sucking their thumb!"
- **Source**: "Unity Point Health 2025"
- **Category**: trimester1
- **Icon**: "hand.point.up.left.fill"

**Fact 22: Morning Sickness is a Good Sign**
- **Title**: "Nausea Means Strong Pregnancy"
- **Fact**: "While miserable, morning sickness (nausea/vomiting) is associated with LOWER miscarriage risk. It peaks around 9 weeks and typically improves by week 14 as hormones stabilize."
- **Source**: "WebMD 2025"
- **Category**: trimester1
- **Icon**: "face.dashed.fill"

**Fact 23: No Lunch Meats or Soft Cheese**
- **Title**: "First Trimester Food Rules"
- **Fact**: "Heat lunch meats to 165°F before eating and avoid unpasteurized soft cheeses (Brie, feta, blue cheese) to prevent listeria, which can cause miscarriage in the vulnerable first trimester."
- **Source**: "Johns Hopkins Medicine 2025"
- **Category**: trimester1
- **Icon**: "exclamationmark.triangle.fill"

**Fact 24: Fever is Dangerous Early On**
- **Title**: "Keep Your Temperature Down"
- **Fact**: "Fever in the first trimester can be harmful to fetal development. Avoid hot yoga, jacuzzis, and saunas. Call your doctor if your temperature exceeds 100.4°F."
- **Source**: "VCU Health 2025"
- **Category**: trimester1
- **Icon**: "thermometer.medium"

#### 2.2 Second Trimester (Weeks 14-27)

**Fact 25: The Golden Trimester**
- **Title**: "Welcome to the Easy Weeks"
- **Fact**: "The second trimester is called the 'golden trimester' because nausea typically disappears, energy returns, and you're not yet uncomfortable from size. Enjoy it while it lasts!"
- **Source**: "Cleveland Clinic 2025"
- **Category**: trimester2
- **Icon**: "sun.horizon.fill"

**Fact 26: Baby Can Taste Your Food**
- **Title**: "Flavor Training Starts Now"
- **Fact**: "At 20 weeks, your baby swallows ¾ to 3 cups of amniotic fluid daily and can taste what you eat! Flavors pass into amniotic fluid, potentially influencing their food preferences after birth."
- **Source**: "Unity Point Health 2025"
- **Category**: trimester2
- **Icon**: "mouth.fill"

**Fact 27: Baby Starts Hearing You**
- **Title**: "Talk to Your Bump"
- **Fact**: "By 23 weeks, your baby can hear your voice and distinguish it from others! By the third trimester, they'll show a favorable response to familiar voices, especially yours."
- **Source**: "Medical News Today 2025"
- **Category**: trimester2
- **Icon**: "waveform"

**Fact 28: You'll Feel Movement at 20 Weeks**
- **Title**: "Hello, Little Kicks!"
- **Fact**: "Most women feel their baby's first movements (quickening) around week 20. First-time moms might not notice until week 25, while experienced moms may feel it as early as 16 weeks."
- **Source**: "Johns Hopkins Medicine 2025"
- **Category**: trimester2
- **Icon**: "figure.mixed.cardio"

**Fact 29: Anatomy Scan at 20 Weeks**
- **Title**: "The Big Ultrasound"
- **Fact**: "The 20-week anatomy scan can take 45 minutes and examines all your baby's organs and structures. Doctors also screen for gestational diabetes around week 28."
- **Source**: "UPMC 2025"
- **Category**: trimester2
- **Icon**: "photo.fill.on.rectangle.fill"

**Fact 30: Round Ligament Pain is Normal**
- **Title**: "Sharp Pains When Moving"
- **Fact**: "Sharp, brief pains on the sides of your belly when you move are round ligament pain—totally normal in the second trimester as ligaments stretch to support your growing uterus."
- **Source**: "Banner Health 2025"
- **Category**: trimester2
- **Icon**: "bolt.horizontal.fill"

#### 2.3 Third Trimester (Weeks 28-40)

**Fact 31: Baby's Eyes Open at 27 Weeks**
- **Title**: "Let There Be Light"
- **Fact**: "At 27 weeks, your baby's eyes open for the first time! They can distinguish between light and dark and even detect light streaming in from outside your body."
- **Source**: "The Bump 2025"
- **Category**: trimester3
- **Icon**: "eye.fill"

**Fact 32: Baby Cries Silently in the Womb**
- **Title**: "Practice Crying at 28 Weeks"
- **Fact**: "Babies begin to cry silently in the womb as early as 28 weeks—not from distress, but to practice for the real world! They also yawn to support brain development."
- **Source**: "Miracare 2025"
- **Category**: trimester3
- **Icon**: "face.smiling.inverse"

**Fact 33: Lungs Mature Last**
- **Title**: "The Final Countdown"
- **Fact**: "Your baby's lungs are the last major organ to finish developing. When fully mature around 36 weeks, they produce a chemical that affects hormones in your body, helping trigger labor."
- **Source**: "Family Doctor 2025"
- **Category**: trimester3
- **Icon**: "wind"

**Fact 34: Braxton Hicks are Practice**
- **Title**: "False Labor Prepares You"
- **Fact**: "Braxton Hicks 'practice contractions' typically start in the second or third trimester. Unlike real labor, they're irregular, don't intensify, and ease with position changes or hydration."
- **Source**: "Cleveland Clinic 2025"
- **Category**: trimester3
- **Icon**: "waveform.path.ecg"

**Fact 35: Baby's Five Senses at 31 Weeks**
- **Title**: "Fully Sensory by 31 Weeks"
- **Fact**: "By 31 weeks, your baby's five senses are largely functional! They're responsive to light, touch, sound, taste, and smell. Touch receptors are fully developed all over their body."
- **Source**: "Tidewater OBGYN 2025"
- **Category**: trimester3
- **Icon**: "hand.raised.fingers.spread.fill"

**Fact 36: Weekly Appointments Start**
- **Title**: "Final Stretch Monitoring"
- **Fact**: "From 28-36 weeks, you'll see your provider every two weeks. After 36 weeks, it's weekly appointments to monitor your and baby's health as you approach your due date."
- **Source**: "Mother Baby Center 2025"
- **Category**: trimester3
- **Icon**: "calendar.badge.clock"

---

### CATEGORY 3: Serious Awareness Topics (30%)

#### 3.1 Mental Health Awareness

**Fact 37: 1 in 5 Women Get Perinatal Depression**
- **Title**: "Mental Health Matters Just as Much"
- **Fact**: "1 in 5 women and 1 in 10 men experience depression or anxiety during pregnancy or postpartum. Postpartum depression rates nearly doubled from 9.4% in 2010 to 19% in 2021."
- **Source**: "NIMH 2025"
- **Category**: mentalHealth
- **Icon**: "brain.head.profile"

**Fact 38: Over Half Go Untreated**
- **Title**: "Don't Suffer in Silence"
- **Fact**: "Over 50% of women with postpartum depression don't get treatment due to stigma or reluctance to disclose symptoms. Depression and anxiety are common AND treatable—speak up!"
- **Source**: "Policy Center for Maternal Mental Health 2025"
- **Category**: mentalHealth
- **Icon**: "heart.text.square.fill"

**Fact 39: Call the Maternal Mental Health Hotline**
- **Title**: "24/7 Help is Available"
- **Fact**: "If you're struggling with mental health during or after pregnancy, call or text 1-833-TLC-MAMA (1-833-852-6262) to reach counselors 24/7. You're not alone."
- **Source**: "MCHB 2025"
- **Category**: mentalHealth
- **Icon**: "phone.circle.fill"

#### 3.2 Pregnancy Complications

**Fact 40: Preeclampsia Warning Signs**
- **Title**: "Know the Preeclampsia Symptoms"
- **Fact**: "Preeclampsia affects 5-8% of pregnancies. Warning signs: severe headache that won't go away, vision changes, severe belly pain, sudden swelling of face/hands. Call your doctor immediately!"
- **Source**: "CDC Hear Her Campaign 2025"
- **Category**: complications
- **Icon**: "exclamationmark.octagon.fill"

**Fact 41: Gestational Diabetes Affects 10%**
- **Title**: "GDM Screening Around Week 28"
- **Fact**: "Gestational diabetes affects about 10% of pregnancies. It's screened around week 28 and raises risk of preeclampsia and C-section. The good news: it's manageable with diet, exercise, and monitoring."
- **Source**: "Mayo Clinic 2025"
- **Category**: complications
- **Icon**: "chart.line.uptrend.xyaxis"

**Fact 42: These Complications Are Connected**
- **Title**: "GDM Increases Preeclampsia Risk"
- **Fact**: "Having gestational diabetes significantly increases your risk of developing preeclampsia. Both conditions together further increase adverse outcomes, so close monitoring is essential."
- **Source**: "Nature Scientific Reports 2024"
- **Category**: complications
- **Icon**: "arrow.triangle.branch"

**Fact 43: Long-Term Heart Health Risks**
- **Title**: "Pregnancy Reveals Future Health"
- **Fact**: "Women who had preeclampsia or gestational diabetes have increased risk of cardiovascular disease later in life. Use this as motivation for healthy lifestyle changes after pregnancy!"
- **Source**: "BMC Pregnancy and Childbirth 2019"
- **Category**: complications
- **Icon**: "heart.circle.fill"

#### 3.3 Emergency Warning Signs

**Fact 44: Urgent Maternal Warning Signs**
- **Title**: "When to Call 911"
- **Fact**: "Seek immediate care for: severe headache that won't go away, trouble breathing, chest pain, severe belly pain, heavy bleeding soaking a pad in <1 hour, thoughts of self-harm, or baby stops moving."
- **Source**: "CDC Hear Her Campaign 2025"
- **Category**: emergency
- **Icon**: "exclamationmark.triangle.fill"

**Fact 45: Always Say You're Pregnant**
- **Title**: "Speak Up in Emergencies"
- **Fact**: "When seeking emergency care, ALWAYS say you're pregnant or were pregnant in the last year. Some problems can happen up to a year after delivery, and providers need this context."
- **Source**: "CDC Hear Her Campaign 2025"
- **Category**: emergency
- **Icon**: "mic.fill"

**Fact 46: Trust Your Instincts**
- **Title**: "If Something Feels Wrong..."
- **Fact**: "If something doesn't feel right—even if you're not sure it's serious—contact your healthcare provider or go to the ER. Many women with severe complications didn't realize the seriousness beforehand."
- **Source**: "Henry Ford Health 2024"
- **Category**: emergency
- **Icon**: "hand.raised.fill"

#### 3.4 Safe Medication & Substances

**Fact 47: Caffeine Limit is 200mg**
- **Title**: "One Cup of Coffee is Safe"
- **Fact**: "ACOG says up to 200mg of caffeine daily is safe during pregnancy—that's about one 12-oz cup of coffee. Limit tea and caffeinated sodas too, as amounts add up quickly."
- **Source**: "ACOG 2025"
- **Category**: health
- **Icon**: "cup.and.saucer.fill"

**Fact 48: No Alcohol, Period**
- **Title**: "Zero Alcohol is Safest"
- **Fact**: "No amount of alcohol is proven safe during pregnancy. It can cause fetal alcohol spectrum disorders (FASDs), leading to physical, behavioral, and learning problems. Abstain completely."
- **Source**: "CDC 2025"
- **Category**: health
- **Icon**: "nosign"

**Fact 49: Hot Tubs Can Cause Miscarriage**
- **Title**: "Avoid Raising Core Temperature"
- **Fact**: "Hot tubs and whirlpools can double your miscarriage risk, especially in the first trimester. Avoid hot yoga, saunas, and baths over 100°F—keep your core temperature below 101°F."
- **Source**: "UT Southwestern Medical Center 2025"
- **Category**: health
- **Icon**: "thermometer.sun.fill"

#### 3.5 Body Changes Awareness

**Fact 50: 'Baby Brain' is Real**
- **Title**: "Pregnancy Brain is Science-Backed"
- **Fact**: "50-80% of pregnant women report memory lapses. Research confirms cognitive changes, especially in the third trimester, as your brain prunes connections to become more efficient for motherhood."
- **Source**: "UT Southwestern Medical Center 2025"
- **Category**: awareness
- **Icon**: "brain.head.profile"

**Fact 51: Your Uterus Grows 500-1000x**
- **Title**: "Incredible Uterine Expansion"
- **Fact**: "By the end of pregnancy, your uterus is 500-1000 times its normal size! It grows from the size of a pear to accommodate a full-term baby, placenta, and amniotic fluid."
- **Source**: "Miracare 2025"
- **Category**: awareness
- **Icon**: "arrow.up.right.circle.fill"

**Fact 52: Your Feet May Permanently Grow**
- **Title**: "Shoe Shopping After Pregnancy?"
- **Fact**: "The hormone relaxin softens ligaments throughout your body, including your feet. Many women's feet flatten and grow wider during pregnancy—sometimes permanently! You may need new shoes."
- **Source**: "Miracare 2025"
- **Category**: awareness
- **Icon**: "figure.walk"

**Fact 53: Stretch Marks Affect 90%**
- **Title**: "Stretch Marks are Normal"
- **Fact**: "50-90% of women get stretch marks during pregnancy. No cream is scientifically proven to prevent them, but keeping skin moisturized with hyaluronic acid and centella may help minimize appearance."
- **Source**: "American Academy of Dermatology 2025"
- **Category**: awareness
- **Icon**: "waveform.path"

**Fact 54: Constipation Gets Worse in Trimester 3**
- **Title**: "Keep Things Moving"
- **Fact**: "Constipation is most common in the third trimester when the heavier uterus puts pressure on bowels. Combat it with 25-30g fiber daily, exercise, hydration, and probiotics."
- **Source**: "Cleveland Clinic 2025"
- **Category**: awareness
- **Icon**: "figure.walk.circle.fill"

---

### CATEGORY 4: Random Interesting/Funny Facts (10%)

**Fact 55: Baby is Born with 300 Bones**
- **Title**: "Babies Have More Bones Than You"
- **Fact**: "Newborns are born with about 300 bones, but adults only have 206! Many bones fuse together as children grow. This makes birth easier and allows for rapid early growth."
- **Source**: "Unity Point Health 2025"
- **Category**: funFact
- **Icon**: "fossil.shell.fill"

**Fact 56: You Produce 3 Years of Estrogen in One Day**
- **Title**: "Hormone Explosion"
- **Fact**: "At full term, a pregnant woman produces more estrogen in ONE DAY than a non-pregnant woman produces in THREE YEARS. No wonder you feel different!"
- **Source**: "Miracare 2025"
- **Category**: funFact
- **Icon**: "sparkles"

**Fact 57: Babies Show Hand Dominance at 8 Weeks**
- **Title**: "Righty or Lefty?"
- **Fact**: "75% of babies show right-hand dominance at just 8 weeks in the womb! The other 25% show left-hand preference or no preference. They're already developing their personality!"
- **Source**: "Pregnancy Resource Center 2025"
- **Category**: funFact
- **Icon**: "hand.thumbsup.fill"

**Fact 58: Newborns Can't Cry Real Tears**
- **Title**: "Tears Come Later"
- **Fact**: "Newborns can holler and scream, but can't produce actual tears until about 3 weeks of age. Their tear ducts aren't fully developed yet—but the crying is still VERY real!"
- **Source**: "Unity Point Health 2025"
- **Category**: funFact
- **Icon**: "drop.fill"

**Fact 59: You May Lactate From Other Babies Crying**
- **Title**: "Sympathetic Let-Down Reflex"
- **Fact**: "In late pregnancy, some women start lactating automatically when they hear someone else's baby crying! Your body is practicing its response to baby's needs."
- **Source**: "Miracare 2025"
- **Category**: funFact
- **Icon**: "ear.fill"

**Fact 60: One in 2000 Babies is Born with Teeth**
- **Title**: "Natal Teeth Surprise"
- **Fact**: "About 1 in every 2,000-3,000 infants is born with one or two teeth already present (natal teeth). They're usually lower front teeth and may need removal if loose."
- **Source**: "Unity Point Health 2025"
- **Category**: funFact
- **Icon**: "face.smiling.inverse"

---

## Updated Data Model Recommendation

### New Category Enum
```swift
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
        }
    }
}
```

### Add Trimester Filtering
```swift
struct PregnancyFunFact {
    // ... existing properties
    let applicableTrimester: Int? // nil = all trimesters, 1/2/3 = specific

    static func factsForCurrentWeek(_ weekNumber: Int) -> [PregnancyFunFact] {
        let trimester = weekNumber <= 13 ? 1 : weekNumber <= 27 ? 2 : 3
        return allFacts.filter {
            $0.applicableTrimester == nil || $0.applicableTrimester == trimester
        }
    }
}
```

### Smart Category Distribution Logic
```swift
extension PregnancyFunFact {
    static func randomFactWithDistribution(currentWeek: Int) -> PregnancyFunFact {
        let random = Int.random(in: 1...100)

        let categoryFilter: (PregnancyFunFact) -> Bool = { fact in
            switch random {
            case 1...30: // 30% Health Tips
                return [.health, .nutrition].contains(fact.category)
            case 31...60: // 30% Trimester-Specific
                let trimester = currentWeek <= 13 ? 1 : currentWeek <= 27 ? 2 : 3
                let trimesterCategories: [FactCategory] = [.trimester1, .trimester2, .trimester3]
                return fact.applicableTrimester == trimester ||
                       (fact.category == .trimester1 && trimester == 1) ||
                       (fact.category == .trimester2 && trimester == 2) ||
                       (fact.category == .trimester3 && trimester == 3)
            case 61...90: // 30% Serious Awareness
                return [.mentalHealth, .complications, .emergency, .awareness].contains(fact.category)
            case 91...100: // 10% Fun Facts
                return fact.category == .funFact
            default:
                return true
            }
        }

        let eligibleFacts = allFacts.filter(categoryFilter)
        return eligibleFacts.randomElement() ?? allFacts.randomElement()!
    }
}
```

---

## Implementation Plan

### Phase 1: Update Data Model (30 min)
1. Add new `FactCategory` cases to enum
2. Add `applicableTrimester: Int?` property to `PregnancyFunFact`
3. Update `color` computed property with new category colors
4. Update card UI to handle new category names

### Phase 2: Add New Facts to Database (1 hour)
1. Add all 45 new researched facts to `allFacts` array
2. Set appropriate `applicableTrimester` values:
   - Trimester-specific facts: set to 1, 2, or 3
   - General facts: set to `nil`
3. Update existing 15 facts with `applicableTrimester: nil`
4. Verify all facts have proper icon names from SF Symbols

### Phase 3: Implement Smart Distribution Logic (45 min)
1. Create `randomFactWithDistribution(currentWeek:)` method
2. Integrate with `PregnancyDataManager` to get current week
3. Update `PregnancyFunFactCard` to use smart distribution instead of pure random
4. Add optional "Category Filter" UI to let users browse by category

### Phase 4: Testing (30 min)
1. Test fact rotation shows proper distribution over 20+ rotations
2. Test trimester-specific facts appear at appropriate weeks
3. Verify all icons render correctly
4. Check accessibility labels for new categories
5. Test card appearance with longer fact text

### Phase 5: Optional Enhancements
1. Add "Mark as Favorite" feature to save interesting facts
2. Add "Share Fact" button to share via Messages/Social
3. Add "Learn More" button that opens source website
4. Track which facts have been shown to avoid repetition
5. Add manual category filter UI in settings

---

## Source Attribution Summary

### Medical Organizations
- **ACOG** (American College of Obstetricians and Gynecologists) - 2020, 2025
- **CDC** (Centers for Disease Control) - 2024, 2025
- **NHS** (National Health Service UK) - 2025
- **NIH** (National Institutes of Health) - 2025
- **NIMH** (National Institute of Mental Health) - 2025

### Academic & Research
- European Journal of Applied Physiology - 2025
- British Journal of Sports Medicine - 2023
- BMC Pregnancy and Childbirth - 2019
- Nature Scientific Reports - 2024
- Policy Center for Maternal Mental Health - 2025

### Healthcare Institutions
- Johns Hopkins Medicine - 2025
- Mayo Clinic - 2025
- Cleveland Clinic - 2025
- Penn Dental Medicine - 2025
- UT Southwestern Medical Center - 2025
- Unity Point Health - 2025
- Henry Ford Health - 2024

### Pregnancy Resources
- Tommy's (UK Pregnancy Charity) - 2025
- American Pregnancy Association - 2025
- March of Dimes - 2025
- Mother Baby Center - 2025
- Sleep Foundation - 2025

---

## Notes & Considerations

### Content Balance Achieved
- ✅ 30% Health Tips (Facts 1-18): Nutrition, hydration, vaccines, sleep, dental, weight, pelvic floor
- ✅ 30% Trimester-Specific (Facts 19-36): 6 facts per trimester covering development milestones
- ✅ 30% Serious Awareness (Facts 37-54): Mental health, complications, emergencies, body changes
- ✅ 10% Fun/Interesting (Facts 55-60): Surprising and memorable pregnancy trivia

### Tone Considerations
- Health tips: Informative, empowering, specific with numbers
- Trimester facts: Wonder and excitement about baby development
- Serious awareness: Direct, non-alarmist, action-oriented
- Fun facts: Lighthearted, surprising, conversation-starters

### Accessibility
- All facts include clear titles for quick scanning
- Icon choices use standard SF Symbols for consistency
- Color coding helps visual categorization
- Sources cited for credibility and further research

### Future Research Topics (Not Included)
- International/cultural pregnancy practices
- Twin/multiple pregnancy facts
- Pregnancy loss support and statistics
- Breastfeeding preparation
- Partner/family support tips
- Pregnancy after 35 or teen pregnancy
- High-risk pregnancy conditions (beyond GDM and preeclampsia)

---

## Total New Facts: 45
## Total Database After Implementation: 60 facts
## Estimated Implementation Time: 3 hours
