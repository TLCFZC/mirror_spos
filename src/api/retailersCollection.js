import axios from "axios";
import * as XLSX from "xlsx";

const BASE_URL = import.meta.env.VITE_API_URL_NODE;

export const retailersCollection = async (startDate, endDate) => {
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  };

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  const storedData = JSON.parse(localStorage.getItem("userData"));

  try {
    const response = await axios.post(
      `${BASE_URL}/subscriber/retailersCollection`,
      {
        dateFrom: formattedStartDate,
        dateTo: formattedEndDate,
      }
    );

    const data = response.data;

    if (data.StatusMessage === "Success") {
      let dataArray = [];
      if (typeof data.Data === "string") {
        try {
          dataArray = JSON.parse(data.Data);
        } catch (error) {
          return {
            success: false,
            message: error,
          };
        }
      } else if (Array.isArray(data.Data)) {
        dataArray = data.Data;
      } else {
        return { success: false, message: "Invalid data.Data format." };
      }

      const formattedData = dataArray.map((item) => ({
        MSISDN: item.MSISDN,
        FullName: `${item.FIRSTNAME} ${item.LASTNAME}`,
        Alias: item.ALIAS,
        RegistrationDate: item.REGDATE,
        MainBalance: item.MAIN_BALANCE,
        CommissionBalance: item.COMMISSION_BALANCE,
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      // Bold headers
      const range = XLSX.utils.decode_range(worksheet["!ref"]); // Get the range of the sheet
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // Header row
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = { font: { bold: true } }; // Apply bold font
        }
      }

      // Adjust column widths based on both header and data content
      const columnWidths = Object.keys(formattedData[0]).map((key) => {
        // Get the max length of header and all rows in the column
        let maxLength = key.length; // Start with the length of the header

        formattedData.forEach((row) => {
          const value = row[key] ? row[key].toString() : "";
          maxLength = Math.max(maxLength, value.length);
        });

        return { width: maxLength + 2 }; // Add some padding
      });

      worksheet["!cols"] = columnWidths;

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Retailers List");
      XLSX.writeFile(workbook, `${storedData.msisdn} Retailers List.xlsx`);

      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return Promise.reject({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};
