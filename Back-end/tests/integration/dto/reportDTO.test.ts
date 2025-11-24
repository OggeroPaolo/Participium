import { describe, it, expect } from "vitest";
import mapToDTO from "../../../src/dto/ReportMapDTO.js";
import type { ReportMap } from "../../../src/models/reportMap.js";

describe("mapToDTO", () => {
    it("should correctly map a ReportMap object to ReportMapDTO", () => {
        const mockReportMap: ReportMap = {
            id: 1,
            title: "Sample report",
            first_name: "John",
            last_name: "Doe",
            position_lat: 40.0,
            position_lng: -70.0
        };

        const result = mapToDTO(mockReportMap);

        expect(result).toEqual({
            id: 1,
            title: "Sample report",
            reporterName: "John Doe",
            position: {
                lat: 40.0,
                lng: -70.0
            }
        });
    });

    it("should map names even if last name is empty", () => {
        const mockReportMap: ReportMap = {
            id: 2,
            title: "Another",
            first_name: "Alice",
            last_name: "",
            position_lat: 10,
            position_lng: 20
        };

        const result = mapToDTO(mockReportMap);

        expect(result.reporterName).toBe("Alice ");
    });
});
