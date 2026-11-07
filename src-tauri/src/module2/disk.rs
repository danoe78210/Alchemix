//! Espace disque libre d'un dossier (FR-018), via l'API Windows `GetDiskFreeSpaceExW`.
//! Aucune crate externe : la fonction est fournie par kernel32, présent sur toutes les versions de Windows.

use crate::module2::error::{ErrorCode, Module2Error};
use std::path::Path;

#[link(name = "kernel32")]
extern "system" {
    fn GetDiskFreeSpaceExW(
        lp_directory_name: *const u16,
        lp_free_bytes_available_to_caller: *mut u64,
        lp_total_number_of_bytes: *mut u64,
        lp_total_number_of_free_bytes: *mut u64,
    ) -> i32;
}

/// Octets disponibles pour l'utilisateur courant sur le volume de `dir`.
/// Erreur si le dossier n'existe pas ou si Windows ne répond pas.
pub fn free_bytes(dir: &Path) -> Result<u64, Module2Error> {
    use std::os::windows::ffi::OsStrExt;
    let wide: Vec<u16> = dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let mut free: u64 = 0;
    // SAFETY : `wide` est une chaîne UTF-16 terminée par zéro, vivante pendant l'appel ;
    // les autres paramètres sont optionnels et acceptent un pointeur nul.
    let ok = unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut free, std::ptr::null_mut(), std::ptr::null_mut()) };
    if ok == 0 {
        return Err(Module2Error::new(
            ErrorCode::WorkdirNotWritable,
            format!("espace disque illisible : {}", dir.display()),
        ));
    }
    Ok(free)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn free_bytes_of_an_existing_folder_is_positive() {
        let free = free_bytes(&std::env::temp_dir()).unwrap();
        assert!(free > 0);
    }

    #[test]
    fn free_bytes_of_a_missing_folder_is_an_error() {
        let missing = std::env::temp_dir().join("alchemix-m2-disk-absent-folder");
        let err = free_bytes(&missing).unwrap_err();
        assert_eq!(err.code, ErrorCode::WorkdirNotWritable);
    }
}
