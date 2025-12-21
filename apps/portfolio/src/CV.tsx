import type { DataModule } from './Resume';

type ProfileType = DataModule['BENJAMIN_PROFILE'];
type UILabelsType = DataModule['UI_LABELS'];

export const CV = ({ theme = 'light', profile, ui }: { theme?: 'light' | 'dark'; profile: ProfileType; ui: UILabelsType }) => {
  const isDark = theme === 'dark';
  
  // If CV section is hidden, don't render
  if (!ui.showCvSection) {
    return null;
  }
  
  const textColor = isDark ? 'text-[#00FF00]' : 'text-[#1A2321]';
  const mutedColor = isDark ? 'text-[#00FF00]/60' : 'text-[#1A2321]/60';
  const headingColor = isDark ? 'text-[#00FFFF]' : 'text-[#1A2321]';
  const linkColor = isDark ? 'text-[#00FFFF]' : 'text-[#1B29FF]';
  const containerClass = isDark ? 'font-mono bg-black border-2 border-[#00FF00] p-6 md:p-10 relative' : 'font-sans';
  const dividerClass = isDark ? 'border-b border-dashed border-[#00FF00]/30' : 'border-b border-[#1A2321]/20';

  return (
    <div id="cv-section" className="w-full max-w-4xl mx-auto py-12 px-6 print:py-0 print:px-8 print:max-w-none">
      {/* Print-specific styles */}
      <style>{`
        @media print {
          #cv-section {
            font-family: 'Georgia', 'Times New Roman', serif !important;
            font-size: 11pt !important;
            line-height: 1.3 !important;
            color: black !important;
            background: white !important;
            padding: 0.5in !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          #cv-section * {
            color: black !important;
            background: transparent !important;
            border-color: #333 !important;
          }
          #cv-section h2 {
            font-size: 24pt !important;
            margin-bottom: 2pt !important;
          }
          #cv-section h3 {
            font-size: 10pt !important;
            margin-bottom: 4pt !important;
            margin-top: 8pt !important;
          }
          #cv-section h4 {
            font-size: 12pt !important;
          }
          #cv-section p, #cv-section li, #cv-section span {
            font-size: 10pt !important;
          }
          #cv-section a {
            color: black !important;
            text-decoration: none !important;
          }
          #cv-section .print-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            border-bottom: 2pt solid black !important;
            padding-bottom: 8pt !important;
            margin-bottom: 12pt !important;
          }
          #cv-section .print-two-col {
            display: grid !important;
            grid-template-columns: 1fr 2fr !important;
            gap: 24pt !important;
          }
          #cv-section .print-section {
            margin-bottom: 8pt !important;
          }
          #cv-section .print-role {
            margin-bottom: 8pt !important;
          }
          #cv-section .print-role-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
          }
          #cv-section .print-skills {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 4pt 12pt !important;
          }
          #cv-section .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div className={containerClass}>
        {/* CAD Decorations for Dark Mode */}
        {isDark && (
          <>
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00FF00] print:hidden" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00FF00] print:hidden" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00FF00] print:hidden" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00FF00] print:hidden" />
            <div className="absolute top-2 right-4 text-[10px] text-[#00FF00]/40 print:hidden">DOC_REF: CV_2025_V4</div>
          </>
        )}

        {/* Header */}
        <div className={`print-header ${dividerClass} pb-6 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end print:flex-row print:items-start`}>
          <div>
            <h2 className={`text-4xl md:text-5xl font-bold uppercase mb-2 ${headingColor} ${isDark ? 'tracking-widest' : 'tracking-tight'}`}>
              {profile.name}
            </h2>
            <p className={`text-lg md:text-xl ${textColor}`}>
              {profile.tagline}
            </p>
          </div>
          <div className={`mt-4 md:mt-0 text-right ${mutedColor} text-sm`}>
            <p>San Francisco / Remote</p>
            <a href="mailto:benjamin.shafii@gmail.com" className={`${linkColor} hover:underline`}>benjamin.shafii@gmail.com</a>
            <br/>
            <a href={profile.linkedin} className={`${linkColor} hover:underline`}>LinkedIn</a>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="print-two-col grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Left Column: Skills & Info */}
          <div className="md:col-span-4 space-y-10 print:space-y-4">
            {/* Summary */}
            <section className="print-section">
              <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${mutedColor}`}>
                {isDark ? '[ ABOUT ]' : 'About'}
              </h3>
              <p className={`text-sm leading-relaxed ${textColor}`}>
                {profile.description}
              </p>
            </section>

            {/* Core Competencies - only show if enabled */}
            {ui.showSkillsSection && (
              <section className="print-section">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${mutedColor}`}>
                  {isDark ? '[ SKILLS ]' : 'Core Competencies'}
                </h3>
                <ul className={`print-skills text-sm space-y-2 ${textColor} print:space-y-0`}>
                  <li>Product Strategy</li>
                  <li>Technical Architecture</li>
                  <li>DeFi & Stablecoins</li>
                  <li>Developer Experience (DX)</li>
                  <li>Team Leadership</li>
                  <li>0 to 1 Launch</li>
                </ul>
              </section>
            )}

            {/* Tech Stack - only show if skills enabled */}
            {ui.showSkillsSection && (
              <section className="print-section">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${mutedColor}`}>
                  {isDark ? '[ TECH ]' : 'Tech Stack'}
                </h3>
                <ul className={`print-skills text-sm space-y-2 ${textColor} print:space-y-0`}>
                  <li>TypeScript / Node.js</li>
                  <li>React / Next.js</li>
                  <li>Solidity / EVM</li>
                  <li>PostgreSQL / Vector DB</li>
                  <li>Python / AI</li>
                </ul>
              </section>
            )}
          </div>

          {/* Right Column: Experience/Projects */}
          <div className="md:col-span-8 space-y-10 print:space-y-4">
            {/* Experience/Projects */}
            <section className="print-section">
              <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${mutedColor} ${dividerClass} pb-2`}>
                {isDark ? `>> ${ui.experienceTitle.toUpperCase()}` : ui.experienceTitle}
              </h3>
              
              <div className="space-y-8 print:space-y-3">
                {profile.roles.map((role, i) => (
                  <div key={i} className="print-role">
                    <div className="print-role-header flex justify-between items-baseline mb-2">
                      {role.url ? (
                        <a 
                          href={role.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`text-xl font-bold ${headingColor} hover:underline underline-offset-2 ${isDark ? 'hover:text-[#00FF00]' : 'hover:text-[#1B29FF]'}`}
                        >
                          {role.company}
                        </a>
                      ) : (
                        <h4 className={`text-xl font-bold ${headingColor}`}>
                          {role.company}
                        </h4>
                      )}
                      {ui.showTimeline && (
                        <span className={`text-xs font-mono ${mutedColor}`}>
                          {role.period}
                        </span>
                      )}
                    </div>
                    {ui.showJobTitles && (
                      <div className={`text-sm font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-[#00FF00]' : 'text-[#1B29FF]'}`}>
                        {role.title}
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed ${textColor}`}>
                      {role.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Ventures - only show if enabled */}
            {ui.showVenturesSection && (
              <section className="print-section">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${mutedColor} ${dividerClass} pb-2`}>
                   {isDark ? `>> ${ui.venturesTitle.toUpperCase()}` : ui.venturesTitle}
                </h3>
                <div className="space-y-6 print:space-y-2">
                  {profile.history.map((item, i) => (
                    <div key={i} className="print-role">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-baseline gap-2">
                          {item.url ? (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`text-base font-bold ${textColor} hover:underline ${isDark ? 'hover:text-[#00FFFF]' : 'hover:text-[#1B29FF]'}`}
                            >
                              {item.company}
                            </a>
                          ) : (
                            <span className={`text-base font-bold ${textColor}`}>
                              {item.company}
                            </span>
                          )}
                          <span className={`text-sm ${mutedColor}`}>
                            — {item.role}
                          </span>
                        </div>
                        {ui.showTimeline && (
                          <span className={`text-xs font-mono ${mutedColor}`}>
                            {item.period}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${mutedColor}`}>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
