export const generateDeviceFingerprint = async (): Promise<string> => {
  const components: string[] = [];

  // Browser info
  components.push(navigator.userAgent);
  components.push(navigator.language);
  components.push(String(navigator.hardwareConcurrency));
  components.push(String(window.screen.width));
  components.push(String(window.screen.height));
  components.push(String(window.screen.colorDepth));
  components.push(String(new Date().getTimezoneOffset()));

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('IntelliRecruit', 2, 15);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    components.push('canvas-error');
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {
    components.push('webgl-error');
  }

  // Create hash
  const fingerprint = await hashString(components.join('|'));
  return fingerprint;
};

const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};