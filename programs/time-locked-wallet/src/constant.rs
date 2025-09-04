use anchor_lang::constant;

#[constant]
pub const VAULT_SEED: &[u8] = b"vault"; // PDA lưu trữ ví timelock

#[constant]
pub const DEPOSIT_RECORD_SEED: &[u8] = b"deposit_record"; // PDA lưu thông tin từng khoản gửi

#[constant]
pub const BENEFICIARY_SEED: &[u8] = b"beneficiary"; // Người thụ hưởng

pub const MAX_DESCRIPTION_LENGTH: usize = 100; // Mô tả ngắn gọn lý do gửi (optional)
