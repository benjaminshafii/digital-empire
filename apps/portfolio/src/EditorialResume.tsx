import { useState, useEffect } from 'react';
import { CV } from './CV';
import { InlineToggle, DataModule } from './Resume';

// --- Components ---



interface EditorialResumeProps {
  onToggle: () => void;
  data: DataModule;
}

export const EditorialResume = ({ onToggle, data }: EditorialResumeProps) => {
  const content = data.ZERO_FINANCE_CONTENT.dollars;
  const ui = data.UI_LABELS;
  const [activeProject, setActiveProject] = useState(content.features.items[0]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const interests = [
    "Beginning of Infinity", "Jed McKenna", "Fabric of Reality", "Anti-fragile", 
    "Cooking for Friends", "Building Things", "Ambient Music"
  ];
  
  const spotifyPlaylist = "https://open.spotify.com/playlist/2nDVaifSU8I0eMCfW4sH4y?si=2c0aa140d0c347aa";

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cv-section, #cv-section * { visibility: visible; }
          #cv-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
        }
        .headline-sans {
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.04em;
          line-height: 0.85;
        }
        .serif-body {
          font-family: 'Libre Baskerville', serif;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }
        .type-mono {
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: -0.02em;
        }
        .bg-paper {
          background-color: #ffffff;
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #000; border-radius: 3px; }
      `}</style>
      
      <div className="min-h-screen bg-white flex justify-center py-4 px-2 md:py-8 md:px-8 font-sans selection:bg-black selection:text-white">
        {/* Noise Texture Overlay */}
        <div 
          className="fixed inset-0 pointer-events-none z-[100] mix-blend-multiply opacity-[0.03]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />

        <div className="bg-paper w-full max-w-[1200px] relative flex flex-col">
          
          {/* Header */}
          <header 
            className="grid grid-cols-12 items-end p-4 md:p-12 pb-4 md:pb-6 border-b border-black sticky top-0 bg-paper z-50 transition-shadow duration-300"
            style={{ boxShadow: scrolled ? '0 4px 20px -5px rgba(0,0,0,0.1)' : 'none' }}
          >
            <div className="col-span-8">
              <h1 className="headline-sans font-black text-5xl md:text-7xl uppercase leading-none text-black">
                Benjamin<br/>Shafii
              </h1>
            </div>
            
            <div className="col-span-4 flex flex-col items-end justify-between h-full min-h-[60px]">
              <div className="text-right">
                <p className="type-mono text-[9px] uppercase tracking-widest text-gray-500 mb-1">Role</p>
                <p className="serif-body font-bold text-sm text-black">Crypto Builder<br/>& Founder</p>
              </div>
            </div>
          </header>

          {/* Interests Bar */}
          <div className="border-y border-black py-2 md:py-3 px-4 md:px-12 bg-white/50 flex justify-between items-center overflow-x-auto">
            <div className="flex gap-6 flex-wrap type-mono text-[9px] uppercase tracking-wider text-gray-600">
              {interests.map((item, i) => (
                <span key={i} className="flex items-center gap-6">
                  <span>{item}</span>
                  {i < interests.length - 1 && <span className="w-1 h-1 bg-black/30 rounded-full" />}
                </span>
              ))}
            </div>
            <a 
              href={spotifyPlaylist}
              target="_blank"
              rel="noopener noreferrer"
              className="type-mono text-[9px] text-gray-400 hover:text-black transition-colors flex items-center gap-1"
              title="Music to read along"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </a>
          </div>

          {/* Hero Section */}
          <div className="p-4 md:p-12 border-b border-black">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
              <div className="md:col-span-7 flex flex-col justify-between">
                <h2 className="serif-body text-3xl md:text-4xl leading-tight mb-8">
                  Building for people who<br/>bank in <InlineToggle isTechnical={false} onToggle={onToggle} />.
                </h2>
                <div className="max-w-md space-y-6">
                  <p className="type-mono text-xs leading-relaxed text-gray-800">
                    {content.hero.description}
                  </p>
                  <div className="flex gap-6">
                    <a href="#work" className="type-mono text-[10px] uppercase font-bold hover:underline flex items-center gap-1">
                      View Work <span>→</span>
                    </a>
                    <a href="https://blog.benjaminshafii.com" className="type-mono text-[10px] uppercase font-bold text-gray-500 hover:text-black hover:underline">
                      Blog
                    </a>
                    <a href="mailto:benjamin.shafii@gmail.com" className="type-mono text-[10px] uppercase font-bold text-gray-500 hover:text-black hover:underline">
                      Contact
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-5">
                <div className="aspect-[4/3] w-full border border-black p-1 bg-white">
                  <div className="w-full h-full overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-500">
                    <img 
                      src={content.hero.image} 
                      className="w-full h-full object-cover mix-blend-multiply contrast-125" 
                      alt="Hero" 
                    />
                  </div>
                </div>
                <p className="type-mono text-[9px] text-gray-400 mt-2 text-right">{content.hero.imageCaption}</p>
              </div>
            </div>
          </div>

          {/* Interactive Work Section */}
          <main id="work" className="flex-grow">
            {/* Section Header */}
            <div className="flex justify-between items-end p-4 md:p-12 pb-3 md:pb-4 border-b border-black bg-paper z-10">
              <h3 className="headline-sans font-black text-4xl uppercase text-black">{content.features.title}</h3>
              <span className="type-mono text-[9px] uppercase text-gray-500">{content.features.subtitle}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
              
              {/* Left Column: Scrollable List */}
              <div className="lg:col-span-7 lg:border-r border-black">
                {content.features.items.map((item, index) => (
                  <div 
                    key={index}
                    onMouseEnter={() => setActiveProject(item)}
                    className={`group relative p-4 md:p-12 border-b border-black cursor-pointer transition-colors duration-300 
                               ${activeProject.title === item.title ? 'bg-white' : 'hover:bg-white/50'}`}
                  >
                    {/* Year & Role */}
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`type-mono text-[10px] px-2 py-0.5 rounded-full border transition-colors
                                      ${activeProject.title === item.title ? 'border-black bg-black text-white' : 'border-gray-400 text-gray-500'}`}>
                        {item.year || String(index + 1).padStart(2, '0')}
                      </span>
                      {item.role && (
                        <span className="type-mono text-[10px] uppercase tracking-wider text-gray-500">{item.role}</span>
                      )}
                    </div>

                    {/* Title & Desc */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          {item.logo && (
                            <img 
                              src={item.logo} 
                              alt={`${item.title} logo`}
                              className="w-10 h-10 object-contain flex-shrink-0"
                            />
                          )}
                          <h2 className="headline-sans font-black text-4xl md:text-5xl uppercase transition-transform duration-300 group-hover:translate-x-2">
                            {item.title}
                          </h2>
                        </div>
                        <p className="serif-body text-lg text-gray-800 leading-relaxed max-w-lg">
                          {item.desc}
                        </p>
                      </div>
                      <span className={`text-2xl transition-all duration-300 ${activeProject.title === item.title ? '-rotate-45 opacity-100' : 'opacity-0 -translate-x-4'}`}>
                        →
                      </span>
                    </div>

                    {/* View Project Link */}
                    {item.url && (
                      <a 
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex items-center gap-2 type-mono text-[10px] uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                      >
                        View Project <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Right Column: Sticky Preview */}
              <div className="hidden lg:block lg:col-span-5 relative bg-white">
                <div className="sticky top-32 p-8 h-[calc(100vh-150px)] flex flex-col">
                  {/* Preview Card */}
                  <div className="w-full aspect-[3/4] border-2 border-black bg-white p-2 shadow-2xl relative overflow-hidden">
                    
                    {/* Dynamic Image with Fade */}
                    {content.features.items.map((item, index) => (
                      <div 
                        key={index}
                        className={`absolute inset-2 transition-opacity duration-500 ${activeProject.title === item.title ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                      >
                        {item.previewImage ? (
                          <img 
                            src={item.previewImage} 
                            alt={`${item.title} preview`}
                            className="w-full h-full object-cover object-top" 
                          />
                        ) : item.logo ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <img 
                              src={item.logo} 
                              alt={item.title}
                              className="w-32 h-32 object-contain" 
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                    ))}
                    
                    {/* Lens UI Overlays */}
                    <div className="absolute bottom-4 left-4 z-20 bg-black text-white px-3 py-2">
                      <p className="type-mono text-[10px] uppercase">Viewing: {activeProject.title}</p>
                    </div>
                    
                    <div className="absolute top-4 right-4 z-20">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <p className="type-mono text-[9px] text-gray-500 mt-4 text-center">
                    Hover list to preview projects
                  </p>
                </div>
              </div>
            </div>
          </main>

          {/* Philosophy Section - Stats Style */}
          <section className="p-4 md:p-12 border-t-2 border-black bg-paper">
            <div className="flex justify-between items-end mb-6 md:mb-12">
              <h3 className="headline-sans font-black text-2xl md:text-3xl uppercase text-black">{content.howItWorks.title}</h3>
              <span className="type-mono text-[9px] uppercase text-gray-500">{content.howItWorks.subtitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-2">
              {content.howItWorks.steps.map((step) => (
                <div key={step.id}>
                  <div className="headline-sans font-black text-5xl mb-4 text-black">
                    {step.title}
                  </div>
                  <div className="h-px bg-black/20 w-full mb-3" />
                  <p className="serif-body text-sm text-gray-700 leading-tight">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CV Section */}
          {ui.showCvSection && (
            <section id="cv-section" className="bg-paper border-t border-black/20 print:border-0">
              {ui.showPrintButton && (
                <div className="p-4 md:p-12 pb-0 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="type-mono text-[9px] uppercase tracking-wider text-gray-500 hover:text-black transition-colors inline-flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    {ui.printButton}
                  </button>
                </div>
              )}
              <CV theme="light" profile={data.BENJAMIN_PROFILE} ui={data.UI_LABELS} />
            </section>
          )}

          {/* Footer */}
          <footer className="p-4 md:p-12 border-t border-black bg-paper print:hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-12">
              <div>
                <h4 className="headline-sans font-black text-xl mb-4">Navigation</h4>
                <ul className="space-y-2 type-mono text-[10px] uppercase text-gray-600">
                  <li><a href="#work" className="hover:text-black cursor-pointer">Work</a></li>
                  <li><a href="#cv-section" className="hover:text-black cursor-pointer">Resume</a></li>
                  <li><a href="https://blog.benjaminshafii.com" className="hover:text-black cursor-pointer">Blog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="headline-sans font-black text-xl mb-4">Socials</h4>
                <ul className="space-y-2 type-mono text-[10px] uppercase text-gray-600">
                  <li><a href="https://x.com/hotkartoffel1" className="hover:text-black cursor-pointer">Twitter / X</a></li>
                  <li><a href="https://github.com/different-ai" className="hover:text-black cursor-pointer">GitHub</a></li>
                  <li><a href="https://www.linkedin.com/in/ben-shafii-450039107/" className="hover:text-black cursor-pointer">LinkedIn</a></li>
                </ul>
              </div>
              <div className="col-span-2">
                <h4 className="headline-sans font-black text-xl mb-4">Philosophy</h4>
                <p className="serif-body text-sm leading-relaxed max-w-sm">
                  "{content.footer.desc}"
                </p>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-300 pt-4">
              <span className="type-mono text-[9px] text-gray-400">San Francisco — Est. 2018</span>
              <span className="type-mono text-[9px] text-gray-400">{content.hero.badge}</span>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
};
