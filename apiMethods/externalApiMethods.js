const { machinesensor, machinesensorcount, ppSchema, ppcount,userCount,userCreation } = require('../models/userCreationModel');


function getFormattedDateTime() {
  const now = new Date();

  let day = String(now.getDate()).padStart(2, '0');
  let month = String(now.getMonth() + 1).padStart(2, '0'); // Month starts from 0
  let year = now.getFullYear();

  let hours = now.getHours();
  let minutes = String(now.getMinutes()).padStart(2, '0');

  let ampm = hours >= 12 ? 'pm' : 'am';

  hours = hours % 12;
  hours = hours ? hours : 12; // handle midnight (0)

  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}
module.exports = (() => {
  const express = require('express');
  const router = express.Router();
  const firebaseService = require('../config/firebaseService');
  const axios = require("axios");
  const https = require("https");
  const config = require("../config/apiConfig");
  // Allow SAP self-signed SSL
  const sapAxios = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });
  const handleAxiosError = (error, functionName) => {
    console.error(`Error in ${functionName}:`, error.message);

    // Log detailed error information if available
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("Request made but no response received:", error.request);
    } else {
      console.error("Error details:", error.message);
    }

    // Return an error object to send a consistent response
    return { error: `Error processing your request in ${functionName}` };
  };



  const getAuthHeader = () => {
    if (!config.THIRD_PARTY_USERNAME || !config.THIRD_PARTY_PASSWORD) {
      throw new Error("Third-party API credentials are missing");
    }

    const credentials = `${config.THIRD_PARTY_USERNAME}:${config.THIRD_PARTY_PASSWORD}`;
    const token = Buffer.from(credentials).toString("base64");
    return `Basic ${token}`;
  };
  return {
    getMotorsLogsData: async (req, res) => {
      try {
        const motorlogsData = await firebaseService.getMotorLogs();
        const sensorData = await firebaseService.getSensorData();
        console.log("motorlogsData", motorlogsData, "sensorData", sensorData)

        if (!motorlogsData || motorlogsData.length === 0) {
          return res.status(200).json({
            message: "No Data Available",
            motorlogsData: [],
            sensorData: sensorData || [],
            status: 200
          });
        }

        res.status(200).json({
          message: "Data Fetched Successfully",
          motorlogsData: motorlogsData,
          sensorData: sensorData || [],
          status: 200
        });

      } catch (error) {
        res.status(500).json({
          message: "Failed to Fetch Data",
          error: error.message
        });
      }
    },


    machinesensorSave: async (req, res) => {
      // console.log("newCompanyCreation ", req, res)
      console.log("newCompanyCreation request received", req);
      try {

        const { machine, sensor } = req;

        const counter = await machinesensorcount.findOneAndUpdate(
          { name: "machinesensorUniqueId" },
          { $inc: { value: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const machinesensorUniqueId = counter.value;
        console.log("machinesensorUniqueId", machinesensorUniqueId);
        const Payload = new machinesensor({
          machine,
          sensor,
          machinesensorUniqueId
        })

        const storedData = await Payload.save()

        res.status(200).json({
          message: "Created Successfully",
          status: 200,
          data: storedData,
          machinesensorUniqueId
        })

      } catch (error) {
        console.error("Error in ::", error);
        res.status(500).json({
          message: "Failed to Save",
          status: 500,
          error: error.message
        })
      }
    },
    machinesensorUpdate: async (req, res) => {
      console.log("req.params:", req.params, "req.body:", req);

      try {
        const machinesensorUniqueId = Number(req.machinesensorUniqueId); // Convert to number
        if (isNaN(machinesensorUniqueId)) {
          return res.status(400).json({
            message: "Invalid Customer ID",
            status: 400
          });
        }

        const updateObj = req;
        console.log("companyUniqueId:", machinesensorUniqueId);
        console.log("updateObj:", updateObj);

        const updateUserObj = await machinesensor.findOneAndUpdate(
          { machinesensorUniqueId: machinesensorUniqueId },
          { $set: updateObj },
          { new: true, runValidators: true }
        );

        console.log("updateUserObj:", updateUserObj);

        if (!updateUserObj) {
          return res.status(404).json({
            message: "Not found based on given Id",
            status: 404
          });
        }

        res.status(200).json({
          message: "Data Updated Successfully",
          status: 200,
          updatedList: updateUserObj
        });

      } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({
          message: "Failed to Update",
          status: 500,
          error: error.message
        });
      }
    },
    machinesensorList: async (req, res) => {
      try {
        const List = await machinesensor.find()

        if (!List || List.length === 0) {
          return res.status(200).json({
            message: "No Data Available",
            List: [],
            status: 200
          })

        }

        res.status(200).json({
          message: "Data Fetched Successfully",
          data: List,
          status: 200
        })

      } catch (error) {
        res.status(500).json({
          message: "Failed to Fetch Data"
        })

      }

    },

    deleteGlobally: async (req, res) => {
      try {
        const { globalId, screenName } = req;
        console.log("globalId", globalId, "typeOfTable", screenName)
        if (!globalId || !screenName) {
          return res.status(400).json({ message: "Missing required fields", status: 400 });
        }

        let deletedRecord;

        switch (screenName) {
          case "machinesensor":
            deletedRecord = await machinesensor.findOneAndDelete({ machinesensorUniqueId: globalId });
            break;
          case "customer":
            deletedRecord = await customerCreation.findOneAndDelete({ customerUniqueId: globalId });
            break;

          default:
            return res.status(400).json({ message: "Invalid table type", status: 400 });
        }
        console.log("deletedRecord", deletedRecord)

        if (!deletedRecord) {
          return res.status(404).json({ message: "Record not found", status: 404 });
        }

        res.status(200).json({ message: "Record deleted successfully", status: 200 });
      } catch (error) {
        console.error("Error in deleteGlobally:", error);
        res.status(500).json({ message: "Deletion failed", status: 500, error: error.message });
      }
    },









    // sap api integration starts here 

    getProductionPlanning: async (body, res) => {
      try {
        console.log(
          "cooisoperation",
          JSON.stringify(body, null, 2)
        );
        const response = await sapAxios.post(
          config.ThirdParty_COOISOperations_POST,
          body,
          {
            headers: {
              Authorization: getAuthHeader()
            }
          }
        );
        console.log(
          "coois operations:",
          JSON.stringify(response.data, null, 2)
        );
        res.json(response.data);
      } catch (error) {
        handleAxiosError(error, "coois operations");
        res.status(500).json({ error: "Failed to process Post request" });
      }
    },
    submitLoginSap: async (body, res) => {
      try {
        console.log(
          "cooisoperation",
          JSON.stringify(body, null, 2)
        );
        const response = await sapAxios.post(
          config.THIRD_PARTY_API_URL_POST_LOGIN,
          body,
          {
            headers: {
              Authorization: getAuthHeader()
            }
          }
        );
        console.log(
          "coois operations:",
          JSON.stringify(response.data, null, 2)
        );
        res.json(response.data);
      } catch (error) {
        handleAxiosError(error, "coois operations");
        res.status(500).json({ error: "Failed to process Post request" });
      }
    },
    saveDataEntry: async (body, res) => {
      try {
        console.log(
          "cooisoperation",
          JSON.stringify(body, null, 2)
        );
        const response = await sapAxios.post(
          config.ThirdParty_DataEntry_POST,
          body,
          {
            headers: {
              Authorization: getAuthHeader()
            }
          }
        );
        console.log(
          "coois operations:",
          JSON.stringify(response.data, null, 2)
        );
        res.json(response.data);
      } catch (error) {
        handleAxiosError(error, "coois operations");
        res.status(500).json({ error: "Failed to process Post request" });
      }
    },
    // pp
    //  productionPlanningSave: async (req, res) => {
    //   // console.log("newCompanyCreation ", req, res)
    //   console.log("newCompanyCreation request received", req);
    //   try {

    //     const {productionPlanningUniqueId, productionOrderNumber,activity,productName,productDes,workCenterOrMachine,sensor,operationDes,quantity,unit,startDate,endDate,shifts,supervisorName,status,createdUser } = req;

    //     // const counter = await ppcount.findOneAndUpdate(
    //     //   { name: "productionPlanningUniqueId" },
    //     //   { $inc: { value: 1 } },
    //     //   { new: true, upsert: true, setDefaultsOnInsert: true }
    //     // );
    //     // const productionPlanningUniqueId = counter.value;
    //     // const productionPlanningUniqueId = productionOrderNumber+activity;
    //     console.log("productionPlanningUniqueId", productionPlanningUniqueId);

    //     let createdDateAndTime = getFormattedDateTime()
    //     const Payload = new ppSchema({
    //       productionOrderNumber,
    //       activity,productName,
    //       productDes,
    //       workCenterOrMachine,
    //       sensor,
    //       operationDes,
    //       quantity,
    //       unit,
    //       startDate,
    //       endDate,
    //       shifts,
    //       supervisorName,
    //       status,
    //       createdDateAndTime,
    //       createdUser,
    //       productionPlanningUniqueId
    //     })

    //     const storedData = await Payload.save()

    //     res.status(200).json({
    //       message: "Created Successfully",
    //       status: 200,
    //       data: storedData,
    //       productionPlanningUniqueId
    //     })

    //   } catch (error) {
    //     console.error("Error in ::", error);
    //     res.status(500).json({
    //       message: "Failed to Save",
    //       status: 500,
    //       error: error.message
    //     })
    //   }
    // },
    // productionPlanningSave: async (req, res) => {
    //   try {

    //     const items = req; // <-- receive array
    //     console.log("req.body",req)
    //     if (!Array.isArray(items)) {
    //       return res.status(400).json({ message: "Input must be an array" });
    //     }

    //     let savedItems = [];

    //     for (const item of items) {

    //       const {
    //         productionPlanningUniqueId,
    //         productionOrderNumber,
    //         activity,
    //         productName,
    //         productDes,
    //         workCenterOrMachine,
    //         sensor,
    //         operationDes,
    //         quantity,
    //         unit,
    //         startDate,
    //         endDate,
    //         shifts,
    //         supervisorName,
    //         status,
    //         createdUser
    //       } = item;

    //       // Auto-generate date & time
    //       const createdDateAndTime = getFormattedDateTime();

    //       const Payload = new ppSchema({
    //         productionPlanningUniqueId,
    //         productionOrderNumber,
    //         activity,
    //         productName,
    //         productDes,
    //         workCenterOrMachine,
    //         sensor,
    //         operationDes,
    //         quantity,
    //         unit,
    //         startDate,
    //         endDate,
    //         shifts,
    //         supervisorName,
    //         status,
    //         createdDateAndTime,
    //         createdUser
    //       });

    //       const storedData = await Payload.save();
    //       savedItems.push(storedData);
    //     }

    //     res.status(200).json({
    //       message: "Saved Successfully",
    //       status: 200,
    //       data: savedItems
    //     });

    //   } catch (error) {
    //     console.error("Error in Save:", error);
    //     res.status(500).json({
    //       message: "Failed to Save",
    //       status: 500,
    //       error: error.message
    //     });
    //   }
    // }
    // baclup on 04-12-2025 by sunil
    // productionPlanningSave: async (req, res) => {
    //   try {

    //     const items = req.body;   // ✅ FIXED
    //     console.log("req.body", req.body, req)

    //     if (!Array.isArray(items)) {
    //       return res.status(400).json({ message: "Input must be an array" });
    //     }

    //     let validationErrors = [];

    //     for (const item of items) {

    //       const requiredFields = [
    //         "productionPlanningUniqueId",
    //         "productionOrderNumber",
    //         "activity",
    //         "productName",
    //         "productDes",
    //         "workCenterOrMachine",
    //         "sensor",
    //         "operationDes",
    //         "quantity",
    //         "unit",
    //         "startDate",
    //         "endDate",
    //         "shifts",
    //         "supervisorName",
    //         "createdUser"
    //       ];

    //       const missing = requiredFields.filter(field => !item[field]);

    //       if (missing.length > 0) {
    //         validationErrors.push({
    //           orderNumberAndActivity: item.productionPlanningUniqueId,
    //           message: `Missing fields: ${missing.join(", ")}`
    //         });
    //       }
    //     }

    //     if (validationErrors.length > 0) {
    //       return res.status(200).json({
    //         message: "Validation Failed",
    //         status: 500,
    //         errors: validationErrors
    //       });
    //     }

    //     let savedItems = [];
    //     for (const item of items) {

    //       const createdDateAndTime = getFormattedDateTime();

    //       const Payload = new ppSchema({
    //         ...item,
    //         createdDateAndTime
    //       });

    //       const storedData = await Payload.save();
    //       savedItems.push(storedData);
    //     }

    //     res.status(200).json({
    //       message: "Saved Successfully",
    //       status: 200,
    //       data: savedItems
    //     });

    //   } catch (error) {
    //     console.error("Error in Save:", error);

    //     if (error.code === 11000) {
    //       return res.status(409).json({
    //         message: "Duplicate Entry Error",
    //         status: 409,
    //         error: `Duplicate value for: ${JSON.stringify(error.keyValue)}`
    //       });
    //     }

    //     res.status(500).json({
    //       message: "Failed to Save",
    //       status: 500,
    //       error: error.message
    //     });
    //   }
    // },
    productionPlanningSave: async (req, res) => {
    try {
        const items = req.body; 
        console.log("items",items)
        // console.log("req.body", req.body, req); // ❌ Remove or comment out this line to avoid logging large objects

        if (!Array.isArray(items)) {
            return res.status(400).json({ message: "Input must be an array" });
        }

        let validationErrors = [];
        let duplicateErrors = [];
        let savedItems = [];

        // 1. Initial Validation Pass
        const requiredFields = [
            "productionPlanningUniqueId", "productionOrderNumber", "activity", "productName", 
            "productDes", "workCenterOrMachine", "sensor", "operationDes", "quantity", 
            "unit", "startDate", "endDate", "shifts", "supervisorName", "createdUser"
        ];

        for (const item of items) {
            const missing = requiredFields.filter(field => !item[field]);

            if (missing.length > 0) {
                validationErrors.push({
                    orderNumberAndActivity: item.productionPlanningUniqueId,
                    message: `Missing fields: ${missing.join(", ")}`
                });
            }
        }
       console.log("validationErrors",validationErrors)
        if (validationErrors.length > 0) {
            return res.status(200).json({
                message: "Validation Failed",
                status: 500,
                errors: validationErrors
            });
        }
        
        // 2. Duplicate Check and Saving Pass
        for (const item of items) {
            const { sensor, startDate, shifts } = item;

            // --- DUPLICATE CHECK LOGIC ---
            const existingPlan = await ppSchema.findOne({
                sensor: sensor,
                startDate: startDate,
                shifts: shifts
            });
            console.log("existingPlan",existingPlan)
          console.log("duplicateErrors",duplicateErrors)
            if (existingPlan) {
                duplicateErrors.push({
                    itemKey: `${sensor} | ${startDate} | ${shifts}`,
                    message: "A record with this Sensor, Start Date, and Shift already exists."
                });
                continue; // Skip saving this item and move to the next one
            }
            // -----------------------------

            // If no duplicate found, proceed to save
            const createdDateAndTime = getFormattedDateTime();
            const counter = await ppcount.findOneAndUpdate(
          { name: "originUniqueId" },
          { $inc: { value: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const originUniqueId = counter.value;
        console.log("originUniqueId", originUniqueId);

            const Payload = new ppSchema({
                ...item,
                originUniqueId,
                createdDateAndTime
            });

            const storedData = await Payload.save();
            savedItems.push(storedData);
        }
        console.log('savedItems',savedItems)
        // 3. Final Response
        if (duplicateErrors.length > 0) {
            // If some items failed due to duplication, return a partial success/failure message
            return res.status(200).json({
                message: savedItems.length > 0 
                    ? `Partially Saved. ${savedItems.length} items saved. ${duplicateErrors.length} items skipped due to duplication.`
                    : "Failed to Save any items due to duplication.",
                status: savedItems.length > 0 ? 202 : 409, // 202 Accepted for partial success, 409 Conflict otherwise
                savedData: savedItems,
                duplicateErrors: duplicateErrors
            });
        }

        res.status(200).json({
            message: "Saved Successfully",
            status: 200,
            data: savedItems
        });

    } catch (error) {
        console.error("Error in Save:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Duplicate Entry Error",
                status: 409,
                error: `Duplicate value for: ${JSON.stringify(error.keyValue)}`
            });
        }

        res.status(500).json({
            message: "Failed to Save",
            status: 500,
            error: error.message
        });
    }
},
    getListOfPP: async (body, res) => {
      try {
        const List = await ppSchema.find()

        if (!List || List.length === 0) {
          return res.status(200).json({
            message: "No Data Available",
            List: [],
            status: 200
          })

        }

        res.status(200).json({
          message: "Data Fetched Successfully",
          data: List,
          status: 200
        })

      } catch (error) {
        res.status(500).json({
          message: "Failed to Fetch Data"
        })

      }
    },

    userCreationSave: async (req, res) => {
      console.log("userCreationSave", req, res)
      try {
        console.log("req.body", req.body);
        const { userName, userFirstName, userLastName, userEmail, userContact, userPassword, userConfirmPassword, userStatus, userActivity } = req.body;
        console.log("userPassword", userPassword, "userConfirmPassword", userConfirmPassword);

        if (userPassword !== userConfirmPassword) {
          return res.status(400).json({ message: "Passwords do not match", status: 400 });
        }

        const existingUser = await userCreation.findOne({ userEmail });
        if (existingUser) {
          return res.status(400).json({ message: "User with this email already exists", status: 400 });
        }

        const counter = await userCount.findOneAndUpdate(
          { name: "userUniqueId" },
          { $inc: { value: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const userUniqueId = counter.value;
        console.log("userUniqueId", userUniqueId);

        // Do NOT hash the password, save it as plain text
        const userPayload = new userCreation({
          userName,
          userFirstName,
          userLastName,
          userEmail,
          userContact,
          userPassword, // Store plain text password
          userConfirmPassword, // Store plain text confirm password (you might not need to save this)
          userStatus,
          userActivity,
          userUniqueId
        });

        const saveNewUser = await userPayload.save();
        res.status(201).json({
          message: "User Created Successfully",
          data: {
            userName: saveNewUser.userName,
            userStatus: saveNewUser.userStatus,
            userActivity: saveNewUser.userActivity,
            userUniqueId: saveNewUser.userUniqueId
          },
          status: 201
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to save the user", status: 500, error: error.message });
      }
    },

    updateUserCreation: async (req, res) => {
      try {
        const { UniqueId } = req.params;
        const updateUserData = req.body;

        // If the password is being updated, keep it as plain text (no hashing)
        if (updateUserData.userPassword) {
          updateUserData.userPassword = updateUserData.userPassword; // Don't hash the password
        }

        const updateUserObj = await userCreation.findOneAndUpdate(
          { userUniqueId: UniqueId },
          { $set: updateUserData },
          { new: true, runValidators: true }
        );

        if (!updateUserObj) {
          return res.status(404).json({ message: "User Not Found", status: 404 });
        }

        res.status(200).json({ message: "User Updated Successfully", data: updateUserObj, status: 200 });
      } catch (error) {
        res.status(500).json({ message: "Update Failed", status: 500, error: error.message });
      }
    },
    getAllUserLists: async (req, res) => {
      try {
        const usersList = await userCreation.find()
        console.log("usersList", usersList)
        if (usersList.length === 0) {
          res.json({
            message: "No Data Available",
            status: 200
          })
        }
        res.json({
          message: "User Data Fetched Successfully",
          data: usersList,
          status: 200
        })

      } catch (error) {

        res.json({
          error: error.message
        })
      }
    },
    userLogin: async (req, res) => {
      try {
        const { userName, userPassword } = req.body; // Get username and password
        console.log("userName", userName, userPassword);

        const user = await userCreation.findOne({ userName }); // Find user by username
        console.log("user", user)
        if (!user) {
          return res.status(404).json({
            message: "User Not Found. Please enter a valid User",
            status: 404,
            isValid: false
          });
        }
        let obj = {
          userName: user.userName,
          userFirstName: user.userFirstName,
          userLastName: user.userLastName,
          userEmail: user.userEmail,
          userUniqueId: user.userUniqueId,
          userStatus: user.userStatus,
          isValid: user.userStatus,
          userActivity: user.userActivity
        }
        console.log("password", userPassword, "user.userPassword", user.userPassword);
        if (user.userStatus == false) {
          return res.status(200).json({
            message: "User Not In Active",
            status: 200,
            data: obj,
          });
        }
        // Compare plain password directly
        if (userPassword !== user.userPassword) {
          return res.status(400).json({
            message: "Invalid Credentials",
            status: 400,
            isValid: false
          });
        }

        // const token = jwt.sign(
        //   { id: user._id, userName: user.userName }, // JWT payload with username
        //   process.env.JWT_SECRET || "your_jwt_secret",
        //   { expiresIn: "1h" }
        // );



        res.status(200).json({
          message: "Login Successful",
          status: 200,
          data: obj,
          // token
        });
      } catch (error) {
        res.status(500).json({ message: "Server Error", status: 500, isValid: false, error: error.message });
      }
    },
    resetPassword: async (req, res) => {
      console.log("resetPassword req.body", req.body)
      try {
        const { userUniqueId, userName, currentPassword, newPassword, confirmPassword } = req.body;

        // Check if user exists
        const user = await userCreation.findOne({ userName });
        if (!user) {
          return res.status(404).json({ message: "User not found", status: 404 });
        }

        // Verify current password (since no hashing, we do a direct comparison)
        if (user.userPassword !== currentPassword) {
          return res.status(400).json({ message: "Current password is incorrect", status: 400 });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmPassword) {
          return res.status(400).json({ message: "Please check New password and confirm password", status: 400 });
        }

        // Update password in database
        user.userPassword = newPassword;
        user.userConfirmPassword = confirmPassword;
        await user.save();

        res.status(200).json({ message: "Password reset successfully", status: 200 });

      } catch (error) {
        res.status(500).json({ message: "Failed to reset password", status: 500, error: error.message });
      }
    },
    forgotPassword: async (req, res) => {

      console.log("forgotPassword", req.res)
      try {
        const { userEmail } = req.body;
        console.log("userEmail", userEmail)
        if (!userEmail) {
          return res.status(400).json({ message: "Email is required" });
        }
        const user = await userCreation.findOne({ userEmail: userEmail });
        console.log("user", user)
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        let obj = {
          userUniqueId: user.userUniqueId,
          userEmail: user.userEmail,
          userName: user.userName,
          userPassword: user.userPassword,
        }

        res.status(200).json({
          message: "Password reset email sent successfully",
          status: 200,
          data: obj
        })
        enterIntoSendMail(obj)
      }
      catch (error) {
        res.status(500).json({
          message: "500 Internal Server Error",
          status: 500
        })
      }

    },
  }




})();
