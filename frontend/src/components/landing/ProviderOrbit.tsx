import { SiAnthropic, SiGooglegemini, SiOpenrouter } from 'react-icons/si';
import { OrbitingCircles } from '../magicui/orbiting-circles';
import { LogoMark } from '../ui/Logo';

// Grok/xAI has no brand icon in the Simple Icons set this project depends on
// (react-icons) — rather than fabricate a logo, it gets a plain monogram
// badge like the center mark, consistent in treatment with real logos.
function GrokBadge() {
  return (
    <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-bold text-[13px]">
      X
    </div>
  );
}

export function ProviderOrbit() {
  return (
    <div className="relative flex h-[380px] w-full items-center justify-center overflow-hidden">
      <LogoMark size={56} className="rounded-xl z-10" />
      <OrbitingCircles radius={140} duration={20} iconSize={52}>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-3 shadow-md">
          <SiAnthropic className="w-full h-full text-[#D97757]" />
        </div>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-3 shadow-md">
          <SiGooglegemini className="w-full h-full text-[#4285F4]" />
        </div>
        <div className="w-full h-full rounded-full overflow-hidden shadow-md">
          <GrokBadge />
        </div>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-3 shadow-md">
          <SiOpenrouter className="w-full h-full text-on-surface" />
        </div>
      </OrbitingCircles>
      <OrbitingCircles radius={200} duration={26} iconSize={40} reverse>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2 shadow-md opacity-70">
          <SiAnthropic className="w-full h-full text-[#D97757]" />
        </div>
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2 shadow-md opacity-70">
          <SiGooglegemini className="w-full h-full text-[#4285F4]" />
        </div>
      </OrbitingCircles>
    </div>
  );
}
