const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Build full image URL
const buildImageUrl = (filename) =>
    `${process.env.BASE_URL}/uploads/eoi/${filename}`;

// GET all events
exports.getAllEvents = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM events_of_interest ORDER BY start_date DESC');

        const events = rows.map(event => ({
            ...event,
            imageUrl: event.imagepath ? buildImageUrl(event.imagepath) : null
        }));

        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST new event
exports.createEvent = async (req, res) => {
    try {
        const { title, description, location, start_date, end_date } = req.body;
        const id = uuidv4();

        const image = req.file ? req.file.filename : null;

        await db.query(
            `INSERT INTO events_of_interest 
       (id, title, description, location, start_date, end_date, imagepath) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, title, description, location, start_date, end_date, image]
        );

        res.status(201).json({ message: 'Event created successfully', id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PUT update event
exports.updateEvent = async (req, res) => {
    const { id } = req.params;
    const { title, description, location, start_date, end_date } = req.body;

    try {
        const fields = [];
        const values = [];

        if (title) { fields.push('title = ?'); values.push(title); }
        if (description) { fields.push('description = ?'); values.push(description); }
        if (location) { fields.push('location = ?'); values.push(location); }
        if (start_date) { fields.push('start_date = ?'); values.push(start_date); }
        if (end_date) { fields.push('end_date = ?'); values.push(end_date); }

        // Handle new image
        if (req.file) {
            const [row] = await db.query('SELECT imagepath FROM events_of_interest WHERE id = ?', [id]);
            const currentImage = row[0]?.imagepath;
            if (currentImage) {
                const filePath = path.join(__dirname, '..', 'uploads', 'eoi', currentImage);
                fs.unlink(filePath, err => {
                    if (err) console.error('Failed to delete old image:', err.message);
                });
            }

            fields.push('imagepath = ?');
            values.push(req.file.filename);
        }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(id);
        await db.query(`UPDATE events_of_interest SET ${fields.join(', ')} WHERE id = ?`, values);

        res.json({ message: 'Event updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE event
exports.deleteEvent = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT imagepath FROM events_of_interest WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });

        const image = rows[0].imagepath;
        if (image) {
            const filePath = path.join(__dirname, '..', 'uploads', 'eoi', image);
            fs.unlink(filePath, err => {
                if (err) console.error('Image delete failed:', err.message);
            });
        }

        await db.query('DELETE FROM events_of_interest WHERE id = ?', [id]);
        res.json({ message: 'Event and image deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
