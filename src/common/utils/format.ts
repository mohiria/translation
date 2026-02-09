/**
 * Ensures IPA phonetic transcription is enclosed in slashes //
 * e.g. "æpl" -> "/æpl/", "/æpl/" -> "/æpl/"
 */
export const formatIPA = (ipa: string | undefined): string => {
  if (!ipa) return '';
  let trimmed = ipa.trim();
  if (!trimmed) return '';
  
  // Remove existing slashes or brackets if they exist to avoid nesting
  // e.g. "/æpl/" -> "æpl", "[æpl]" -> "æpl"
  trimmed = trimmed.replace(/^\/|\/$/g, '').replace(/^\[|\]$/g, '');
  
  return `/${trimmed}/`;
};
