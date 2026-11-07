//! Module 2 — Démixage IA des stems (spec : specs/002-module2-stem-separation/spec.md).
//! Le pipeline est écrit en Rust pur, sans dépendance à Tauri, pour rester testable sans interface.

pub mod bleed;
pub mod chunk;
pub mod decode;
pub mod disk;
pub mod encode;
pub mod error;
pub mod job;
pub mod runtime;
pub mod settings;
pub mod simulate;
