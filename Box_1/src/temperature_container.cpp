#pragma once
#include <vector>
#include <limits>

class TemperatureContainer {
private:
    size_t capacity;
    std::vector<float> data;

public:
    TemperatureContainer(size_t cap) : capacity(cap) {
        data.reserve(capacity);
    }

    void push(float value) {
        data.push_back(value);
        if (data.size() > capacity) {
            data.erase(data.begin()); // drop oldest
        }
    }

    size_t size() const { return data.size(); }

    float operator[](size_t i) const {
        return data[i];
    }

    float back() const {
        return data.back();
    }

    float average() const {
        float total = 0;
        for (float v : data) total += v;
        return total / data.size();
    }

    float min() const {
        float m = std::numeric_limits<float>::max();
        for (float v : data) {
            if (v < m) m = v;
        }
        return m;
    }

    float max() const {
        float m = std::numeric_limits<float>::lowest();
        for (float v : data) {
            if (v > m) m = v;
        }
        return m;
    }

    float range() const {
        return max() - min();
    }
};
