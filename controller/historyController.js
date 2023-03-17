const HistoryModel = require("../models/history")

module.exports.appendFileHistory = async ({ fileId, userId, userRole, content }) => {
    try {
        const history = new HistoryModel({
            fileId,
            userId,
            userRole,
            content,
        });
        console.log({ history })
        await history.save()
        return {
            status: true,
        }
    } catch (error) {
        console.log({ historyAppend_Error: error })
        return {
            status: false,
            message: error.message,
        }
    }
};