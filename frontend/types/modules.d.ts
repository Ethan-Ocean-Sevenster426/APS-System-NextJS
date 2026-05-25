// Ambient declarations for packages whose own types are missing or
// resolve incorrectly under Next 16 + Turbopack bundler resolution
// on the production environment. Types are 'any' on purpose — runtime
// behaviour is unchanged, this just unblocks the type-checker.

declare module "jspdf";
declare module "jspdf-autotable";
