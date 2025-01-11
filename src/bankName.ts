import { zipObject } from "lodash";
import banks from "./json/banks.json";

export const bankKeys = Object.keys(banks.th);
export const bankObjectSchema = zipObject(bankKeys, bankKeys);
// export const bankObjectSchema = {
//   bbl: "bbl",
//   kbank: "kbank",
//   ktb: "ktb",
//   ttb: "ttb",
//   scb: "scb",
//   kkp: "kkp",
//   bay: "bay",
//   cimbt: "cimbt",
//   tisco: "tisco",
//   uobt: "uobt",
//   credit: "credit",
//   lhfg: "lhfg",
//   icbct: "icbct",
//   sme: "sme",
//   baac: "baac",
//   exim: "exim",
//   gsb: "gsb",
//   ghb: "ghb",
// };

export const bankThaiName = {
  BBL: "ธนาคารกรุงเทพ",
  KBANK: "ธนาคารกสิกรไทย",
  KTB: "ธนาคารกรุงไทย",
  TTB: "ธนาคารทหารไทย",
  SCB: "ธนาคารไทยพาณิชย์",
  KKP: "ธนาคารเกียรตินาคิน",
  BAY: "ธนาคารกรุงศรีอยุธยา",
  CIMBT: "ธนาคารซีไอเอ็มบีไทย",
  TISCO: "ธนาคารทิสโก้",
  UOBT: "ธนาคารยูโอบี",
  CREDIT: "ธนาคารเครดิตไทย",
  LHFG: "ธนาคารแลนด์ แอนด์ เฮ้าส์",
  ICBCT: "ธนาคารไอซีบีซี (ไทย)",
  SME: "ธนาคารเอสเอ็มอี",
  BAAC: "ธนาคารออมสิน",
  EXIM: "ธนาคารส่งเสริมการส่งออก",
  GSB: "ธนาคารออมสิน",
  GHB: "ธนาคารอาคารสงเคราะห์",
};
