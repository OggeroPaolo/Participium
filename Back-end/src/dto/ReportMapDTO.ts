import { type ReportMap } from "../models/reportMap.js";

export type ReportMapDTO = {
  id: number;
  title: string;
  reporterName: string;
  reporterUsername: string;
  address: string;
  position: {
    lat: number;
    lng: number;
  };
  is_anonymous: boolean;
};

function mapToDTO(r: ReportMap): ReportMapDTO {
  return {
    id: r.id,
    title: r.title,
    // Mask reporter identity for anonymous reports
    reporterName: r.is_anonymous ? "Anonymous" : `${r.first_name} ${r.last_name}`,
    reporterUsername: r.is_anonymous ? "" : r.username,
    address: r.address,
    position: {
      lat: r.position_lat,
      lng: r.position_lng,
    },
    is_anonymous: r.is_anonymous,
  };
}

export default mapToDTO;
