import {type ReportMap } from '../models/reportMap.js';

export type ReportMapDTO = {
  id: number;
  title: string;
  reporterName: string;
  position: {
    lat: number;
    lng: number;
  };
};


function mapToDTO(r: ReportMap): ReportMapDTO {
  return {
    id: r.id,
    title: r.title,
    reporterName: `${r.first_name} ${r.last_name}`,
    position: {
      lat: r.position_lat,
      lng: r.position_lng
    }
  };
}

export default mapToDTO;
