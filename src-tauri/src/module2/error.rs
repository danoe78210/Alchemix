//! Erreurs du Module 2, selon `contracts/module2-contracts.md` §2 et §6.
//! Le `code` sert à la logique de l'interface ; le `message` est lisible en français.
//!
//! Les variantes non utilisées (ModelMissing, etc.) sont destinées aux actions futures.

#![allow(dead_code)]

use serde::Serialize;

#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    FileNotFound,
    UnsupportedFormat,
    DecodeFailed,
    WorkdirNotSet,
    WorkdirNotWritable,
    DiskFull,
    ModelMissing,
    ModelNotConfirmed,
    DownloadFailed,
    ModelChecksumFailed,
    Cancelled,
    ImportRefused,
    InvalidArgument,
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
pub struct Module2Error {
    pub code: ErrorCode,
    pub message: String,
}

impl Module2Error {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into() }
    }
}
