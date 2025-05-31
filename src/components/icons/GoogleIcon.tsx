import * as React from 'react';

interface GoogleIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function GoogleIcon({ className, ...props }: GoogleIconProps) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 48 48"
      width="24" 
      height="24"
      {...props}
    >
      <g transform="matrix(1, 0, 0, 1, 0, 0)">
        <path fill="#4285F4" d="M 23.76 23.76 v 7.956 h 11.14 c -0.502 2.92 -3.18 8.564 -11.14 8.564 c -6.7 0 -12.17 -5.54 -12.17 -12.38 s 5.47 -12.38 12.17 -12.38 c 3.82 0 6.38 1.62 7.84 3.02 l 5.34 -5.12 C 32.82 9.54 28.62 7.6 23.76 7.6 c -10.38 0 -18.76 8.38 -18.76 18.76 s 8.38 18.76 18.76 18.76 c 10.84 0 18.04 -7.6 18.04 -18.32 c 0 -1.24 -0.14 -2.16 -0.3 -3.1 H 23.76 Z" />
      </g>
    </svg>
  );
}
